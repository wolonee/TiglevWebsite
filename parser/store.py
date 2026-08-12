"""
Хранилище лотов CarClick на SQLite.

Зачем именно SQLite: 83k лотов с фильтрами по марке/цене/году — это уже не то,
что читают из JSON в память. При этом отдельный сервер БД для витрины-агрегатора
не нужен: файл рядом с приложением, индексы, нормальный SQL.

Ключевые решения:

* Лоты никогда не удаляются физически. Проданная машина получает `gone_at`
  и уходит с витрины, но остаётся в базе — иначе теряется история цен
  и ломаются уже проиндексированные ссылки.

* Обход каталога («sweep») помечает всё, что увидел, общей меткой времени.
  Что не увидели — считается снятым с продажи. Но только если обход дошёл
  до конца и собрал правдоподобное число лотов (см. `finish_sweep`),
  иначе оборванная сеть «продаст» весь каталог разом.

* Данные из списка и из карточки пишутся разными наборами колонок.
  Список не знает про галерею и поколение, и не должен затирать их NULL-ом.

Цены везде в рублях. Поле `currency` из API игнорируется намеренно:
в списке оно врёт (отдаёт CNY при рублёвой цене).
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator

SCHEMA_VERSION = 1
DEFAULT_DB = Path(__file__).parent / "data" / "carclick.db"

# Доля от прошлого размера каталога, ниже которой обход считается битым
# и снятие лотов с продажи не выполняется.
SWEEP_SANITY_RATIO = 0.8

SCHEMA = """
CREATE TABLE IF NOT EXISTS lots (
    id                    INTEGER PRIMARY KEY,
    brand                 TEXT,
    brand_code            TEXT,
    model                 TEXT,
    model_code            TEXT,
    generation            TEXT,
    equipment             TEXT,
    year                  INTEGER,
    month                 INTEGER,
    mileage               INTEGER,
    fuel                  TEXT,
    transmission          TEXT,
    drive                 TEXT,
    volume                REAL,
    hp                    INTEGER,
    body_type             TEXT,
    color_exterior        TEXT,
    color_interior        TEXT,
    description           TEXT,
    condition             TEXT,
    country               TEXT,
    country_code          TEXT,
    is_foreign            INTEGER,
    delivery_time         INTEGER,
    price_individual      INTEGER,
    price_individual_eaeu INTEGER,
    price_legal           INTEGER,
    min_scenario_price    INTEGER,
    cover                 TEXT,
    seller_source         TEXT,
    seller_type           TEXT,
    seller_country        TEXT,
    detail_fetched        INTEGER NOT NULL DEFAULT 0,
    source_updated_at     TEXT,           -- updatedAt со стороны CarClick
    first_seen_at         TEXT NOT NULL,  -- когда лот впервые попал к нам
    last_seen_at          TEXT NOT NULL,  -- время последней встречи (для отчётов)
    last_seen_run         INTEGER,        -- id прогона, в котором лот был жив
    gone_at               TEXT            -- снят с продажи (мягкое удаление)
);

-- Все 1.36 млн ссылок на фото начинаются с одного из четырёх путей
-- (.../scraped/che168/, .../scraped/mobilede/ и т.д.). Хранить префикс в каждой
-- строке — это 74 МБ повторов из 108. Поэтому префикс вынесен в справочник,
-- а в images лежит только хвост. Полный адрес собирается при чтении.
CREATE TABLE IF NOT EXISTS image_prefixes (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS images (
    lot_id    INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    position  INTEGER NOT NULL,
    prefix_id INTEGER NOT NULL REFERENCES image_prefixes(id),
    path      TEXT    NOT NULL,
    is_main   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (lot_id, position)
);

-- Опции разложены в отдельные таблицы, а не только JSON-ом в lots.options.
-- Причина: по JSON фильтровать можно лишь поиском подстроки (175 мс на одну опцию,
-- ловит лишние совпадения и не считает фасеты). Через связь это индексированный
-- join за единицы миллисекунд, с корректным «И» по нескольким опциям.
-- JSON-копия в lots.options удалена: она дублировала эти таблицы и весила 120 МБ.
CREATE TABLE IF NOT EXISTS options (
    id          INTEGER PRIMARY KEY,   -- id со стороны CarClick
    name        TEXT NOT NULL,
    group_title TEXT
);

CREATE TABLE IF NOT EXISTS lot_options (
    lot_id    INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL,
    PRIMARY KEY (lot_id, option_id)
);

CREATE TABLE IF NOT EXISTS sync_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kind        TEXT NOT NULL,          -- sweep | fresh | detail
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    seen        INTEGER DEFAULT 0,
    added       INTEGER DEFAULT 0,
    updated     INTEGER DEFAULT 0,
    gone        INTEGER DEFAULT 0,
    errors      INTEGER DEFAULT 0,
    note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_lots_live       ON lots(gone_at) WHERE gone_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lots_brand      ON lots(brand_code, model_code);
CREATE INDEX IF NOT EXISTS idx_lots_price      ON lots(price_individual);
CREATE INDEX IF NOT EXISTS idx_lots_year       ON lots(year);
CREATE INDEX IF NOT EXISTS idx_lots_country    ON lots(country_code);
CREATE INDEX IF NOT EXISTS idx_lots_pending    ON lots(detail_fetched) WHERE detail_fetched = 0;
CREATE INDEX IF NOT EXISTS idx_images_lot      ON images(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_options_opt ON lot_options(option_id);
"""

# Колонки, которые умеет заполнить выдача списка.
LIST_COLUMNS = (
    "brand", "brand_code", "model", "model_code", "equipment",
    "year", "month", "mileage", "fuel", "transmission", "drive",
    "volume", "hp", "color_exterior", "condition", "country_code",
    "price_individual", "price_individual_eaeu", "price_legal",
    "min_scenario_price", "cover",
    "seller_source", "seller_type", "seller_country", "source_updated_at",
)

# Карточка знает всё, что знает список, плюс это.
# `options` здесь намеренно нет: опции хранятся связями в lot_options,
# а JSON-копия в lots занимала 120 МБ дубликата и удалена (см. compact()).
DETAIL_EXTRA_COLUMNS = (
    "generation", "body_type", "color_interior", "description", "country",
    "is_foreign", "delivery_time",
)
DETAIL_COLUMNS = LIST_COLUMNS + DETAIL_EXTRA_COLUMNS


# Отдельного поля кузова в API нет — он спрятан в строке поколения
# («2024 (внедорожник)», «Поколение 5 рестайлинг (универсал)»). В скобках, впрочем,
# попадаются и годы, и «Рестайлинг», поэтому берём только по белому списку.
BODY_TYPES = {
    "внедорожник": "Внедорожник",
    "джип/suv 5 дв.": "Внедорожник",
    "джип/suv 3 дв.": "Внедорожник",
    "седан": "Седан",
    "универсал": "Универсал",
    "хэтчбек": "Хэтчбек",
    "хетчбек": "Хэтчбек",
    "фургон": "Фургон",
    "минивэн": "Минивэн",
    "купе": "Купе",
    "кабриолет": "Кабриолет",
    "пикап": "Пикап",
    "лифтбек": "Лифтбек",
    "родстер": "Родстер",
    "компактвэн": "Компактвэн",
    "микроавтобус": "Микроавтобус",
}


def body_type_from_generation(generation: str | None) -> str | None:
    """«2024 (внедорожник)» -> «Внедорожник». Годы и «другое» отбрасываются."""
    if not generation:
        return None
    import re as _re

    for chunk in _re.findall(r"\(([^)]+)\)", generation):
        found = BODY_TYPES.get(chunk.strip().lower())
        if found:
            return found
    return None


def split_url(url: str) -> tuple[str, str]:
    """https://host/a/b/file.webp -> ("https://host/a/b/", "file.webp")"""
    cut = url.rfind("/")
    return (url[: cut + 1], url[cut + 1 :]) if cut >= 0 else ("", url)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, path: Path | str | None = None) -> None:
        self._prefix_cache: dict[str, int] = {}
        self.path = Path(path or DEFAULT_DB)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path, timeout=30)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode = WAL")
        self.db.execute("PRAGMA synchronous = NORMAL")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)
        self._migrate()
        self.db.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        self.db.commit()

    def _migrate(self) -> None:
        """Догоняет схему на базах, созданных прошлыми версиями."""
        columns = {row[1] for row in self.db.execute("PRAGMA table_info(lots)")}
        if "last_seen_run" not in columns:
            self.db.execute("ALTER TABLE lots ADD COLUMN last_seen_run INTEGER")
        if "body_type" not in columns:
            self.db.execute("ALTER TABLE lots ADD COLUMN body_type TEXT")
            self.db.execute("CREATE INDEX IF NOT EXISTS idx_lots_body ON lots(body_type)")
        if "source" not in columns:
            # Свои машины лежат в тех же таблицах, что и лоты CarClick:
            # витрине нужен один источник, а не склейка двух.
            self.db.execute("ALTER TABLE lots ADD COLUMN source TEXT NOT NULL DEFAULT 'carclick'")
            self.db.execute("CREATE INDEX IF NOT EXISTS idx_lots_source ON lots(source)")
        self.db.commit()

    def backfill_body_types(self) -> int:
        """Проставляет кузов уже загруженным лотам, разбирая строку поколения."""
        rows = self.db.execute(
            "SELECT id, generation FROM lots WHERE body_type IS NULL AND generation IS NOT NULL"
        ).fetchall()
        updates = [
            (found, row["id"])
            for row in rows
            if (found := body_type_from_generation(row["generation"]))
        ]
        if updates:
            with self.transaction() as db:
                db.executemany("UPDATE lots SET body_type = ? WHERE id = ?", updates)
        return len(updates)

    def prune_gone(self, older_than_days: int = 30) -> dict[str, int]:
        """
        У давно проданных лотов убирает галерею и опции.

        Сама строка лота остаётся: на ней держится история цен, и по её id уже
        могут быть проиндексированные ссылки. Но 16 фотографий и 29 опций
        проданной машины никому не нужны, а весят они ~4.2 КБ из 4.8 КБ на лот.

        Без этой чистки база растёт линейно (~100 МБ в месяц при 700 новых лотах
        в сутки), потому что снятые с продажи лоты копятся вечно.
        """
        cutoff = f"-{int(older_than_days)} days"
        targets = [
            row[0]
            for row in self.db.execute(
                "SELECT l.id FROM lots l WHERE l.gone_at IS NOT NULL "
                "AND l.gone_at < datetime('now', ?) "
                "AND (EXISTS (SELECT 1 FROM images WHERE lot_id = l.id) "
                "  OR EXISTS (SELECT 1 FROM lot_options WHERE lot_id = l.id))",
                (cutoff,),
            )
        ]
        if not targets:
            return {"lots": 0, "images": 0, "options": 0}

        with self.transaction() as db:
            placeholders = ",".join("?" * len(targets))
            images = db.execute(
                f"DELETE FROM images WHERE lot_id IN ({placeholders})", targets
            ).rowcount
            options = db.execute(
                f"DELETE FROM lot_options WHERE lot_id IN ({placeholders})", targets
            ).rowcount
        return {"lots": len(targets), "images": images or 0, "options": options or 0}

    def compact(self, drop_options_json: bool = True) -> dict[str, Any]:
        """
        Одноразовое ужатие базы под перенос в Postgres.

        1. Ссылки на фото: общий префикс уезжает в справочник (74 МБ из 108 — повторы).
        2. `lots.options`: JSON полностью дублирует таблицу `lot_options`, ~120 МБ.
        """
        report: dict[str, Any] = {"before_mb": round(self.path.stat().st_size / 1024 / 1024, 1)}
        db = self.db
        images_columns = {row[1] for row in db.execute("PRAGMA table_info(images)")}

        if "url" in images_columns:
            db.execute("PRAGMA foreign_keys = OFF")
            db.execute("""CREATE TABLE images_new (
                lot_id INTEGER NOT NULL, position INTEGER NOT NULL,
                prefix_id INTEGER NOT NULL, path TEXT NOT NULL,
                is_main INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (lot_id, position))""")
            # Префикс = всё до последнего слэша. Их единицы, так что справочник крошечный.
            db.execute("""INSERT OR IGNORE INTO image_prefixes (prefix)
                          SELECT DISTINCT substr(url, 1, length(url) - length(replace(
                              substr(url, instr(url, rtrim(url, replace(url, '/', '')))), '', ''))) FROM images WHERE 0""")
            prefixes = {
                row[0] for row in db.execute(
                    "SELECT DISTINCT rtrim(url, replace(url, '/', '')) FROM images"
                )
            }
            for prefix in prefixes:
                db.execute("INSERT OR IGNORE INTO image_prefixes (prefix) VALUES (?)", (prefix,))
            db.commit()
            db.execute("""INSERT INTO images_new (lot_id, position, prefix_id, path, is_main)
                SELECT i.lot_id, i.position, p.id,
                       substr(i.url, length(p.prefix) + 1), i.is_main
                FROM images i JOIN image_prefixes p
                  ON p.prefix = rtrim(i.url, replace(i.url, '/', ''))""")
            moved = db.execute("SELECT COUNT(*) FROM images_new").fetchone()[0]
            original = db.execute("SELECT COUNT(*) FROM images").fetchone()[0]
            if moved != original:
                db.execute("DROP TABLE images_new")
                db.commit()
                raise RuntimeError(f"перенос ссылок неполон: {moved} из {original} — база не тронута")
            db.execute("DROP TABLE images")
            db.execute("ALTER TABLE images_new RENAME TO images")
            db.execute("CREATE INDEX IF NOT EXISTS idx_images_lot ON images(lot_id)")
            db.execute("PRAGMA foreign_keys = ON")
            db.commit()
            report["images_moved"] = moved
            report["prefixes"] = len(prefixes)

        lots_columns = {row[1] for row in db.execute("PRAGMA table_info(lots)")}
        if drop_options_json and "options" in lots_columns:
            indexed = db.execute("SELECT COUNT(DISTINCT lot_id) FROM lot_options").fetchone()[0]
            with_json = db.execute(
                "SELECT COUNT(*) FROM lots WHERE options NOT IN ('[]', '') AND options IS NOT NULL"
            ).fetchone()[0]
            # Удаляем только если связи действительно разложены — иначе потеряем опции.
            if indexed >= with_json:
                db.execute("ALTER TABLE lots DROP COLUMN options")
                db.commit()
                report["options_json_dropped"] = True
            else:
                report["options_json_dropped"] = False
                report["options_warning"] = (
                    f"JSON оставлен: разложено {indexed} лотов из {with_json} — "
                    f"сначала `reindex-options`"
                )

        db.execute("VACUUM")
        report["after_mb"] = round(self.path.stat().st_size / 1024 / 1024, 1)
        report["saved_mb"] = round(report["before_mb"] - report["after_mb"], 1)
        return report

    def close(self) -> None:
        self.db.close()

    def __enter__(self) -> "Store":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        try:
            yield self.db
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    # ---------------------------------------------------------------- запись

    @staticmethod
    def _row_from_record(record: dict[str, Any], columns: tuple[str, ...]) -> dict[str, Any]:
        """Плоская запись парсера → словарь колонок таблицы."""
        seller = record.get("seller") or {}
        source = {
            "brand": record.get("brand"),
            "brand_code": record.get("brandCode"),
            "model": record.get("model"),
            "model_code": record.get("modelCode"),
            "generation": record.get("generation"),
            "equipment": record.get("equipment"),
            "year": record.get("year"),
            "month": record.get("month"),
            "mileage": record.get("mileage"),
            "fuel": record.get("fuel"),
            "transmission": record.get("transmission"),
            "drive": record.get("drive"),
            "volume": record.get("volume"),
            "hp": record.get("hp"),
            "body_type": record.get("bodyType"),
            "color_exterior": record.get("colorExterior"),
            "color_interior": record.get("colorInterior"),
            "description": record.get("description"),
            "condition": record.get("condition"),
            "country": record.get("country"),
            "country_code": record.get("countryCode"),
            "is_foreign": int(bool(record.get("isForeign"))) if record.get("isForeign") is not None else None,
            "delivery_time": record.get("deliveryTime"),
            "price_individual": record.get("priceIndividual"),
            "price_individual_eaeu": record.get("priceIndividualEAEU"),
            "price_legal": record.get("priceLegal"),
            "min_scenario_price": record.get("minScenarioPrice"),
            "cover": record.get("cover"),
            "seller_source": seller.get("source"),
            "seller_type": seller.get("type"),
            "seller_country": seller.get("countryName"),
            "source_updated_at": record.get("updatedAt"),
        }
        return {column: source.get(column) for column in columns}

    def _upsert(
        self,
        records: Iterable[dict[str, Any]],
        columns: tuple[str, ...],
        run_id: int,
        detail: bool,
    ) -> tuple[int, int]:
        """Массовая вставка/обновление. Возвращает (добавлено, обновлено)."""
        records = [record for record in records if record.get("id") is not None]
        if not records:
            return (0, 0)

        seen_at = now_iso()
        ids = [record["id"] for record in records]
        placeholders = ",".join("?" * len(ids))
        existing = {
            row[0]
            for row in self.db.execute(f"SELECT id FROM lots WHERE id IN ({placeholders})", ids)
        }

        all_columns = (
            ("id",) + columns + ("detail_fetched", "first_seen_at", "last_seen_at", "last_seen_run")
        )
        # Повторно увиденный лот снимает пометку "снят с продажи".
        assignments = ", ".join(f"{column} = excluded.{column}" for column in columns)
        statement = (
            f"INSERT INTO lots ({', '.join(all_columns)}) "
            f"VALUES ({', '.join('?' * len(all_columns))}) "
            f"ON CONFLICT(id) DO UPDATE SET {assignments}, "
            f"last_seen_at = excluded.last_seen_at, "
            f"last_seen_run = excluded.last_seen_run, "
            f"detail_fetched = MAX(lots.detail_fetched, excluded.detail_fetched), "
            f"gone_at = NULL"
        )

        rows = []
        for record in records:
            values = self._row_from_record(record, columns)
            rows.append(
                [record["id"]]
                + [values[column] for column in columns]
                + [1 if detail else 0, seen_at, seen_at, run_id]
            )

        with self.transaction() as db:
            db.executemany(statement, rows)

        added = sum(1 for lot_id in ids if lot_id not in existing)
        return (added, len(ids) - added)

    def upsert_list(self, records: Iterable[dict[str, Any]], run_id: int) -> tuple[int, int]:
        return self._upsert(records, LIST_COLUMNS, run_id, detail=False)

    def upsert_detail(self, records: Iterable[dict[str, Any]], run_id: int) -> tuple[int, int]:
        records = list(records)
        added, updated = self._upsert(records, DETAIL_COLUMNS, run_id, detail=True)
        self.replace_images(records)
        self.replace_options(records)
        return (added, updated)

    def replace_options(self, records: Iterable[dict[str, Any]]) -> int:
        """
        Раскладывает `options` лота по таблицам `options` / `lot_options`.

        Формат со стороны CarClick — список групп:
            [{"title": "Безопасность", "items": [{"id": 1, "name": "ABS"}, ...]}, ...]
        """
        catalog: dict[int, tuple[str, str]] = {}
        links: list[tuple[int, int]] = []
        lot_ids: list[int] = []

        for record in records:
            lot_id = record.get("id")
            if lot_id is None:
                continue
            lot_ids.append(lot_id)
            for group in record.get("options") or []:
                if not isinstance(group, dict):
                    continue
                title = group.get("title") or ""
                for item in group.get("items") or []:
                    option_id, name = item.get("id"), item.get("name")
                    if option_id is None or not name:
                        continue
                    catalog[option_id] = (name, title)
                    links.append((lot_id, option_id))

        if not lot_ids:
            return 0

        with self.transaction() as db:
            placeholders = ",".join("?" * len(lot_ids))
            db.execute(f"DELETE FROM lot_options WHERE lot_id IN ({placeholders})", lot_ids)
            if catalog:
                db.executemany(
                    "INSERT INTO options (id, name, group_title) VALUES (?, ?, ?) "
                    "ON CONFLICT(id) DO UPDATE SET name = excluded.name, group_title = excluded.group_title",
                    [(oid, name, title) for oid, (name, title) in catalog.items()],
                )
            if links:
                db.executemany(
                    "INSERT OR IGNORE INTO lot_options (lot_id, option_id) VALUES (?, ?)", links
                )
        return len(links)

    def reindex_options(self, batch: int = 2000) -> tuple[int, int]:
        """
        Разбирает сохранённый JSON в связи — для лотов, загруженных до появления таблиц.

        После `compact()` колонка `lots.options` удалена, и команда становится
        ненужной: свежие лоты раскладываются сразу при записи.
        """
        if "options" not in {row[1] for row in self.db.execute("PRAGMA table_info(lots)")}:
            return (0, 0)
        done = links = 0
        while True:
            rows = self.db.execute(
                "SELECT id, options FROM lots WHERE detail_fetched = 1 "
                "AND options NOT IN ('[]', '') AND options IS NOT NULL "
                "AND id NOT IN (SELECT DISTINCT lot_id FROM lot_options) LIMIT ?",
                (batch,),
            ).fetchall()
            if not rows:
                return (done, links)

            records = []
            for row in rows:
                try:
                    records.append({"id": row["id"], "options": json.loads(row["options"])})
                except json.JSONDecodeError:
                    continue
            links += self.replace_options(records)
            done += len(rows)

    def prefix_id(self, prefix: str) -> int:
        """id префикса, с кешем в памяти — их всего несколько штук на весь каталог."""
        cached = self._prefix_cache.get(prefix)
        if cached is not None:
            return cached
        row = self.db.execute("SELECT id FROM image_prefixes WHERE prefix = ?", (prefix,)).fetchone()
        if row is None:
            cursor = self.db.execute("INSERT INTO image_prefixes (prefix) VALUES (?)", (prefix,))
            self.db.commit()
            value = int(cursor.lastrowid)
        else:
            value = int(row[0])
        self._prefix_cache[prefix] = value
        return value

    def replace_images(self, records: Iterable[dict[str, Any]]) -> None:
        """Галерея переписывается целиком: у лота она меняется редко и атомарно."""
        rows: list[tuple[int, int, int, str, int]] = []
        lot_ids: list[int] = []
        for record in records:
            lot_id = record.get("id")
            if lot_id is None:
                continue
            lot_ids.append(lot_id)
            for position, url in enumerate(record.get("images") or []):
                prefix, path = split_url(url)
                rows.append((lot_id, position, self.prefix_id(prefix), path, 1 if position == 0 else 0))

        if not lot_ids:
            return

        with self.transaction() as db:
            placeholders = ",".join("?" * len(lot_ids))
            db.execute(f"DELETE FROM images WHERE lot_id IN ({placeholders})", lot_ids)
            if rows:
                db.executemany(
                    "INSERT OR REPLACE INTO images (lot_id, position, prefix_id, path, is_main) "
                    "VALUES (?, ?, ?, ?, ?)",
                    rows,
                )

    def mark_gone(self, lot_ids: Iterable[int], when: str | None = None) -> int:
        """Точечное снятие — для лотов, отдавших 404 на карточке."""
        lot_ids = list(lot_ids)
        if not lot_ids:
            return 0
        when = when or now_iso()
        with self.transaction() as db:
            cursor = db.executemany(
                "UPDATE lots SET gone_at = ? WHERE id = ? AND gone_at IS NULL",
                [(when, lot_id) for lot_id in lot_ids],
            )
        return cursor.rowcount if cursor.rowcount and cursor.rowcount > 0 else len(lot_ids)

    # ---------------------------------------------------------------- обходы

    def start_run(self, kind: str) -> int:
        with self.transaction() as db:
            cursor = db.execute(
                "INSERT INTO sync_runs (kind, started_at) VALUES (?, ?)", (kind, now_iso())
            )
        return int(cursor.lastrowid)

    def finish_run(self, run_id: int, **counters: Any) -> None:
        fields = ", ".join(f"{key} = ?" for key in counters)
        with self.transaction() as db:
            db.execute(
                f"UPDATE sync_runs SET finished_at = ?{', ' + fields if fields else ''} WHERE id = ?",
                [now_iso(), *counters.values(), run_id],
            )

    def finish_sweep(self, run_id: int, seen: int) -> tuple[int, str]:
        """
        Помечает снятыми всё, что не встретилось в обходе `run_id`.

        Возвращает (сколько снято, пояснение). Если обход собрал подозрительно
        мало лотов — ничего не трогает: это почти наверняка обрыв, а не то,
        что каталог опустел.

        Сравнивается номер прогона, а не время: `now_iso()` округляет до секунды,
        и два быстрых обхода подряд получали одинаковую метку — снятие тогда
        не срабатывало вовсе. Номера прогонов монотонны и от часов не зависят.

        Условие `last_seen_run < run_id` (а не `!=`) закрывает гонку: лот,
        добавленный командой `fresh` уже во время обхода, получит больший номер
        и не будет ошибочно снят с продажи.
        """
        live_before = self.count_live()
        threshold = live_before * SWEEP_SANITY_RATIO

        if live_before and seen < threshold:
            return (
                0,
                f"обход собрал {seen} лотов при {live_before} живых в базе "
                f"(<{SWEEP_SANITY_RATIO:.0%}) — снятие пропущено, данные не тронуты",
            )

        with self.transaction() as db:
            cursor = db.execute(
                "UPDATE lots SET gone_at = ? "
                "WHERE gone_at IS NULL AND (last_seen_run IS NULL OR last_seen_run < ?)",
                (now_iso(), run_id),
            )
            gone = cursor.rowcount or 0

        return (gone, f"снято с продажи: {gone}")

    # ---------------------------------------------------------------- чтение

    def count_live(self) -> int:
        return int(self.db.execute("SELECT COUNT(*) FROM lots WHERE gone_at IS NULL").fetchone()[0])

    def count_all(self) -> int:
        return int(self.db.execute("SELECT COUNT(*) FROM lots").fetchone()[0])

    def known_ids(self) -> set[int]:
        return {row[0] for row in self.db.execute("SELECT id FROM lots")}

    def pending_detail_ids(self, limit: int = 0) -> list[int]:
        """
        Живые лоты, у которых нет галереи. Свежие — первыми.

        Проверяем не только метку `detail_fetched`, но и наличие фото: `prune`
        вычищает галерею у давно проданных, метку не трогая. Вернувшийся
        в продажу лот иначе остался бы навсегда без фотографий.
        """
        sql = (
            "SELECT id FROM lots l WHERE gone_at IS NULL AND (detail_fetched = 0 "
            "OR NOT EXISTS (SELECT 1 FROM images WHERE lot_id = l.id)) "
            "ORDER BY id DESC"
        )
        if limit:
            sql += f" LIMIT {int(limit)}"
        return [row[0] for row in self.db.execute(sql)]

    def stats(self) -> dict[str, Any]:
        db = self.db
        one = lambda sql: db.execute(sql).fetchone()[0]  # noqa: E731
        return {
            "всего лотов": one("SELECT COUNT(*) FROM lots"),
            "в продаже": one("SELECT COUNT(*) FROM lots WHERE gone_at IS NULL"),
            "снято": one("SELECT COUNT(*) FROM lots WHERE gone_at IS NOT NULL"),
            "с карточкой": one("SELECT COUNT(*) FROM lots WHERE detail_fetched = 1"),
            "фотографий": one("SELECT COUNT(*) FROM images"),
            "марок": one("SELECT COUNT(DISTINCT brand_code) FROM lots WHERE gone_at IS NULL"),
            "моделей": one("SELECT COUNT(DISTINCT model_code) FROM lots WHERE gone_at IS NULL"),
            "размер базы, МБ": round(self.path.stat().st_size / 1024 / 1024, 1),
        }

    def breakdown(self, column: str, limit: int = 10) -> list[tuple[Any, int]]:
        allowed = {"brand", "country_code", "fuel", "transmission", "drive", "condition", "year"}
        if column not in allowed:
            raise ValueError(f"колонка {column!r} недоступна для среза")
        rows = self.db.execute(
            f"SELECT {column}, COUNT(*) AS n FROM lots WHERE gone_at IS NULL "
            f"GROUP BY {column} ORDER BY n DESC LIMIT ?",
            (limit,),
        )
        return [(row[0], row[1]) for row in rows]

    def option_facets(self, limit: int = 0) -> list[tuple[int, str, str, int]]:
        """Опции со счётчиками — для панели фильтров: (id, название, группа, машин)."""
        sql = (
            "SELECT o.id, o.name, o.group_title, COUNT(*) AS n "
            "FROM lot_options lo JOIN options o ON o.id = lo.option_id "
            "JOIN lots l ON l.id = lo.lot_id AND l.gone_at IS NULL "
            "GROUP BY o.id ORDER BY n DESC"
        )
        if limit:
            sql += f" LIMIT {int(limit)}"
        return [(r[0], r[1], r[2], r[3]) for r in self.db.execute(sql)]

    def price_bounds(self) -> dict[str, Any]:
        row = self.db.execute(
            "SELECT MIN(price_individual), MAX(price_individual), AVG(price_individual) "
            "FROM lots WHERE gone_at IS NULL AND price_individual > 0"
        ).fetchone()
        return {"min": row[0], "max": row[1], "avg": int(row[2]) if row[2] else None}

    def iter_export(self, live_only: bool = True, with_images: bool = True) -> Iterator[dict[str, Any]]:
        """Выгрузка для витрины. Ссылка на лот собирается снаружи — с реф-меткой."""
        sql = "SELECT * FROM lots"
        if live_only:
            sql += " WHERE gone_at IS NULL"
        sql += " ORDER BY id DESC"

        options_by_lot: dict[int, list[dict[str, Any]]] = {}
        for row in self.db.execute(
            "SELECT lo.lot_id, o.id, o.name, o.group_title FROM lot_options lo "
            "JOIN options o ON o.id = lo.option_id ORDER BY lo.lot_id"
        ):
            options_by_lot.setdefault(row[0], []).append(
                {"id": row[1], "name": row[2], "group": row[3]}
            )

        gallery: dict[int, list[str]] = {}
        if with_images:
            for row in self.db.execute(
                "SELECT i.lot_id, p.prefix || i.path AS url FROM images i "
                "JOIN image_prefixes p ON p.id = i.prefix_id ORDER BY i.lot_id, i.position"
            ):
                gallery.setdefault(row[0], []).append(row[1])

        for row in self.db.execute(sql):
            record = dict(row)
            if with_images:
                record["images"] = gallery.get(record["id"], [])
            record["options"] = options_by_lot.get(record["id"], [])
            yield record
