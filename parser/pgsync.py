"""
Хранилище каталога на PostgreSQL — для синхронизации без локального SQLite.

Зачем: суточное обновление должно идти по расписанию в GitHub Actions, а не
на чьём-то ноутбуке. Для этого состояние (какие лоты известны, у каких уже
загружена карточка, какой обход был последним) должно жить там же, где данные,
то есть в Postgres. Тогда задача становится без состояния и запускается откуда угодно.

`PgStore` повторяет набор методов SQLite-версии (`store.Store`), поэтому команды
`sweep` / `fresh` / `detail` в `carclick.py` работают с ним без изменений —
вместе со всеми защитами: отказ снимать лоты после оборванного обхода,
предохранитель на вал ошибок, раздельные наборы колонок для списка и карточки.

ГЛАВНОЕ ОТЛИЧИЕ ОТ `pgload`: здесь ничего не удаляется и не пересоздаётся.
`pgload` делает `DROP SCHEMA catalog CASCADE` — при работающей витрине это
означает несколько десятков секунд с несуществующей таблицей. Синхронизация
же обновляет строки на месте, поэтому витрина всегда видит либо старое
значение, либо новое.

Массовая запись идёт через временную таблицу и `COPY`: 83 тысячи отдельных
INSERT по сети с задержкой 70 мс заняли бы полтора часа.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Iterable

from pgdump import INDEXES_SQL, TABLES_DDL
from store import body_type_from_generation, now_iso, split_url

SCHEMA = "catalog"

# Колонки, которые умеет заполнить выдача списка каталога.
LIST_COLUMNS = (
    "brand", "brand_code", "model", "model_code", "equipment",
    "year", "month", "mileage", "fuel", "transmission", "drive",
    "volume", "hp", "color_exterior", "condition", "country_code",
    "price_individual", "price_individual_eaeu", "price_legal",
    "min_scenario_price", "cover", "seller_source", "seller_type",
    "seller_country", "source_updated_at",
)

# Карточка добавляет к этому галерею, опции и всё остальное.
DETAIL_EXTRA_COLUMNS = (
    "generation", "body_type", "color_interior", "description", "country",
    "is_foreign", "delivery_time", "image_prefix_id", "image_paths", "option_ids",
)
DETAIL_COLUMNS = LIST_COLUMNS + DETAIL_EXTRA_COLUMNS

SWEEP_SANITY_RATIO = 0.8

RUNS_TABLE = f"""
CREATE TABLE IF NOT EXISTS {SCHEMA}.sync_runs (
    id          bigserial PRIMARY KEY,
    kind        text NOT NULL,
    started_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    seen        integer DEFAULT 0,
    added       integer DEFAULT 0,
    updated     integer DEFAULT 0,
    gone        integer DEFAULT 0,
    errors      integer DEFAULT 0,
    note        text
);
"""


def read_database_url(env_path: Path | None = None) -> str:
    """
    Строка подключения: сперва переменная окружения, потом файл.

    В GitHub Actions секрет приходит через окружение, локально удобнее из .env.
    """
    from os import environ

    from_env = environ.get("DATABASE_URL", "").strip()
    if from_env:
        return from_env
    if env_path is None:
        raise RuntimeError("нет DATABASE_URL ни в окружении, ни в файле")
    text = env_path.read_text(encoding="utf-8")
    match = re.search(r"^DATABASE_URL=(.+)$", text, re.M)
    if not match:
        raise RuntimeError(f"в {env_path} нет DATABASE_URL")
    url = match.group(1).strip().strip('"').strip("'")
    if "[SENSITIVE]" in url or "://" not in url:
        raise RuntimeError(f"в {env_path} строка подключения недоступна")
    return url


def record_to_columns(record: dict[str, Any], columns: tuple[str, ...]) -> dict[str, Any]:
    """Плоская запись парсера → значения колонок. Галерея и опции — уже массивами."""
    seller = record.get("seller") or {}
    images = record.get("images") or []
    prefix, paths = None, None
    if images:
        prefix, _ = split_url(images[0])
        paths = [split_url(url)[1] for url in images]

    option_ids: list[int] | None = None
    if record.get("options") is not None:
        option_ids = []
        for group in record.get("options") or []:
            if isinstance(group, dict):
                for item in group.get("items") or []:
                    if item.get("id") is not None:
                        option_ids.append(int(item["id"]))
        option_ids = sorted(set(option_ids))

    source = {
        "brand": record.get("brand"),
        "brand_code": record.get("brandCode"),
        "model": record.get("model"),
        "model_code": record.get("modelCode"),
        "generation": record.get("generation"),
        "body_type": record.get("bodyType") or body_type_from_generation(record.get("generation")),
        "equipment": record.get("equipment"),
        "year": record.get("year"),
        "month": record.get("month"),
        "mileage": record.get("mileage"),
        "fuel": record.get("fuel"),
        "transmission": record.get("transmission"),
        "drive": record.get("drive"),
        "volume": record.get("volume"),
        "hp": record.get("hp"),
        "color_exterior": record.get("colorExterior"),
        "color_interior": record.get("colorInterior"),
        "description": record.get("description"),
        "condition": record.get("condition"),
        "country": record.get("country"),
        "country_code": record.get("countryCode"),
        "is_foreign": record.get("isForeign"),
        "delivery_time": record.get("deliveryTime"),
        "price_individual": record.get("priceIndividual"),
        "price_individual_eaeu": record.get("priceIndividualEAEU"),
        "price_legal": record.get("priceLegal"),
        "min_scenario_price": record.get("minScenarioPrice"),
        "cover": record.get("cover"),
        "image_prefix_id": prefix,  # подменяется на id ниже, в PgStore
        "image_paths": paths,
        "option_ids": option_ids,
        "seller_source": seller.get("source"),
        "seller_type": seller.get("type"),
        "seller_country": seller.get("countryName"),
        "source_updated_at": record.get("updatedAt"),
    }
    return {column: source.get(column) for column in columns}


class PgStore:
    """Тот же интерфейс, что у store.Store, но поверх PostgreSQL."""

    def __init__(self, url: str, schema: str = SCHEMA) -> None:
        import psycopg

        self.schema = schema
        self.conn = psycopg.connect(url, connect_timeout=30, autocommit=False)
        self._prefix_cache: dict[str, int] = {}
        self.ensure_schema()

    def close(self) -> None:
        self.conn.close()

    def __enter__(self) -> "PgStore":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    # ------------------------------------------------------------------ схема

    def ensure_schema(self) -> None:
        """
        Создаёт таблицы, если их нет. НИЧЕГО не удаляет — витрина может читать.

        Имена схемы проставляются явно, `SET search_path` НЕ используется.
        Причина дорого обошлась: Neon работает через пулер, и `SET` протекает
        между клиентами — соединение backend'а получало чужой `search_path`
        и создавало свои таблицы (`cars`, `customer_requests`) в схеме каталога.
        Данные не потерялись только потому, что это заметили в тот же день.
        Полные имена от такой протечки невосприимчивы.
        """
        qualified = re.sub(
            r"CREATE TABLE (\w+)", rf"CREATE TABLE IF NOT EXISTS {self.schema}.\1", TABLES_DDL
        )
        # Ссылки внешних ключей тоже должны указывать на нужную схему.
        qualified = re.sub(r"REFERENCES (\w+)\(", rf"REFERENCES {self.schema}.\1(", qualified)
        indexes = re.sub(
            r"CREATE INDEX (\w+)\s+ON (\w+)",
            rf"CREATE INDEX IF NOT EXISTS \1 ON {self.schema}.\2",
            INDEXES_SQL.replace("ANALYZE;", ""),
        )
        with self.conn.cursor() as cur:
            cur.execute(f"CREATE SCHEMA IF NOT EXISTS {self.schema}")
            cur.execute(qualified)
            cur.execute(RUNS_TABLE.replace(f"{SCHEMA}.", f"{self.schema}."))
            cur.execute(indexes)
        self.conn.commit()

    def prefix_id(self, prefix: str) -> int:
        cached = self._prefix_cache.get(prefix)
        if cached is not None:
            return cached
        with self.conn.cursor() as cur:
            cur.execute(f"SELECT id FROM {self.schema}.image_prefixes WHERE prefix = %s", (prefix,))
            row = cur.fetchone()
            if row is None:
                cur.execute(
                    f"INSERT INTO {self.schema}.image_prefixes (id, prefix) "
                    f"VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM {self.schema}.image_prefixes), %s) "
                    f"RETURNING id",
                    (prefix,),
                )
                row = cur.fetchone()
        self.conn.commit()
        self._prefix_cache[prefix] = int(row[0])
        return int(row[0])

    # ----------------------------------------------------------------- запись

    def _upsert(
        self, records: Iterable[dict[str, Any]], columns: tuple[str, ...], run_id: int, detail: bool
    ) -> tuple[int, int]:
        records = [r for r in records if r.get("id") is not None]
        if not records:
            return (0, 0)

        rows = []
        for record in records:
            values = record_to_columns(record, columns)
            if "image_prefix_id" in values and isinstance(values["image_prefix_id"], str):
                values["image_prefix_id"] = self.prefix_id(values["image_prefix_id"])
            rows.append([record["id"], *[values[c] for c in columns]])

        all_columns = ("id", *columns)
        assignments = ", ".join(f"{c} = EXCLUDED.{c}" for c in columns)
        seen_at = now_iso()

        with self.conn.cursor() as cur:
            # Временная таблица + COPY: одна передача вместо 83 тысяч запросов по сети.
            # Создаём через CTAS, а не `LIKE`: последний всегда тащит NOT NULL,
            # а в стейджинг мы кладём лишь часть колонок (`source` и прочие
            # выставляет уже INSERT).
            cur.execute(
                f"CREATE TEMP TABLE stage ON COMMIT DROP AS "
                f"SELECT {', '.join(all_columns)} FROM {self.schema}.lots WITH NO DATA"
            )
            with cur.copy(f"COPY stage ({', '.join(all_columns)}) FROM STDIN") as copy:
                for row in rows:
                    copy.write_row(row)

            cur.execute(
                f"INSERT INTO {self.schema}.lots ({', '.join(all_columns)}, "
                f"detail_fetched, first_seen_at, last_seen_at, last_seen_run) "
                f"SELECT {', '.join(all_columns)}, %s, %s, %s, %s FROM stage "
                f"ON CONFLICT (id) DO UPDATE SET {assignments}, "
                f"last_seen_at = EXCLUDED.last_seen_at, "
                f"last_seen_run = EXCLUDED.last_seen_run, "
                f"detail_fetched = {self.schema}.lots.detail_fetched OR EXCLUDED.detail_fetched, "
                f"gone_at = NULL "
                f"RETURNING (xmax = 0) AS inserted",
                (detail, seen_at, seen_at, run_id),
            )
            flags = [r[0] for r in cur.fetchall()]
        self.conn.commit()

        added = sum(1 for f in flags if f)
        return (added, len(flags) - added)

    def upsert_list(self, records: Iterable[dict[str, Any]], run_id: int) -> tuple[int, int]:
        return self._upsert(records, LIST_COLUMNS, run_id, detail=False)

    def upsert_detail(self, records: Iterable[dict[str, Any]], run_id: int) -> tuple[int, int]:
        records = list(records)
        self.sync_options(records)
        return self._upsert(records, DETAIL_COLUMNS, run_id, detail=True)

    def sync_options(self, records: Iterable[dict[str, Any]]) -> None:
        """Пополняет справочник опций тем, что встретилось в карточках."""
        catalog: dict[int, tuple[str, str]] = {}
        for record in records:
            for group in record.get("options") or []:
                if not isinstance(group, dict):
                    continue
                title = group.get("title") or ""
                for item in group.get("items") or []:
                    if item.get("id") is not None and item.get("name"):
                        catalog[int(item["id"])] = (item["name"], title)
        if not catalog:
            return
        with self.conn.cursor() as cur:
            cur.executemany(
                f"INSERT INTO {self.schema}.options (id, name, group_title) VALUES (%s, %s, %s) "
                f"ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, group_title = EXCLUDED.group_title",
                [(oid, name, title) for oid, (name, title) in catalog.items()],
            )
        self.conn.commit()

    def mark_gone(self, lot_ids: Iterable[int], when: str | None = None) -> int:
        lot_ids = list(lot_ids)
        if not lot_ids:
            return 0
        with self.conn.cursor() as cur:
            cur.execute(
                f"UPDATE {self.schema}.lots SET gone_at = COALESCE(%s::timestamptz, now()) "
                f"WHERE id = ANY(%s) AND gone_at IS NULL",
                (when, lot_ids),
            )
            count = cur.rowcount
        self.conn.commit()
        return count or 0

    # ----------------------------------------------------------------- обходы

    def start_run(self, kind: str) -> int:
        with self.conn.cursor() as cur:
            cur.execute(f"INSERT INTO {self.schema}.sync_runs (kind) VALUES (%s) RETURNING id", (kind,))
            run_id = int(cur.fetchone()[0])
        self.conn.commit()
        return run_id

    def finish_run(self, run_id: int, **counters: Any) -> None:
        fields = ", ".join(f"{key} = %s" for key in counters)
        with self.conn.cursor() as cur:
            cur.execute(
                f"UPDATE {self.schema}.sync_runs SET finished_at = now()"
                f"{', ' + fields if fields else ''} WHERE id = %s",
                [*counters.values(), run_id],
            )
        self.conn.commit()

    def finish_sweep(self, run_id: int, seen: int) -> tuple[int, str]:
        """Снимает с продажи всё, что не встретилось. Отказывается при неполном обходе."""
        live_before = self.count_live()
        if live_before and seen < live_before * SWEEP_SANITY_RATIO:
            return (
                0,
                f"обход собрал {seen} лотов при {live_before} живых "
                f"(<{SWEEP_SANITY_RATIO:.0%}) — снятие пропущено, данные не тронуты",
            )
        with self.conn.cursor() as cur:
            cur.execute(
                f"UPDATE {self.schema}.lots SET gone_at = now() "
                f"WHERE gone_at IS NULL AND (last_seen_run IS NULL OR last_seen_run < %s)",
                (run_id,),
            )
            gone = cur.rowcount or 0
        self.conn.commit()
        return (gone, f"снято с продажи: {gone}")

    # ----------------------------------------------------------------- чтение

    def _scalar(self, sql: str, params: tuple = ()) -> Any:
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()[0]

    def count_live(self) -> int:
        return int(self._scalar(f"SELECT COUNT(*) FROM {self.schema}.lots WHERE gone_at IS NULL"))

    def count_all(self) -> int:
        return int(self._scalar(f"SELECT COUNT(*) FROM {self.schema}.lots"))

    def known_ids(self) -> set[int]:
        with self.conn.cursor() as cur:
            cur.execute(f"SELECT id FROM {self.schema}.lots")
            return {row[0] for row in cur}

    def pending_detail_ids(self, limit: int = 0) -> list[int]:
        """
        Лоты в продаже, у которых нет галереи.

        Второе условие важно: `prune` вычищает фото у давно проданных лотов,
        но метку `detail_fetched` не снимает. Если такой лот вернётся в продажу
        (sweep снимет `gone_at`), он останется живым без единого фото и по одной
        только метке в очередь не попадёт. Поэтому смотрим и на саму галерею.
        """
        sql = (
            f"SELECT id FROM {self.schema}.lots WHERE gone_at IS NULL "
            f"AND (detail_fetched = false OR image_paths IS NULL) ORDER BY id DESC"
        )
        if limit:
            sql += f" LIMIT {int(limit)}"
        with self.conn.cursor() as cur:
            cur.execute(sql)
            return [row[0] for row in cur]

    def prune_gone(self, older_than_days: int = 30) -> dict[str, int]:
        """У давно проданных лотов очищает галерею и опции; строка остаётся."""
        with self.conn.cursor() as cur:
            cur.execute(
                f"UPDATE {self.schema}.lots SET image_paths = NULL, option_ids = NULL, "
                f"image_prefix_id = NULL "
                f"WHERE gone_at IS NOT NULL AND gone_at < now() - make_interval(days => %s) "
                f"AND (image_paths IS NOT NULL OR option_ids IS NOT NULL)",
                (int(older_than_days),),
            )
            count = cur.rowcount or 0
        self.conn.commit()
        return {"lots": count, "images": 0, "options": 0}

    def db_size_mb(self) -> float:
        return float(self._scalar("SELECT pg_database_size(current_database())")) / 1024 / 1024
