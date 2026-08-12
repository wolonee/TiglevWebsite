"""
Генератор спецификации фильтров для витрины.

Отдаёт JSON, из которого фронтенд рисует панель фильтров: какие фильтры бывают,
какие у них значения и сколько машин под каждым значением.

Смысл в том, чтобы список фильтров не был захардкожен в вёрстке. Каталог живой:
марки появляются, опции меняются, счётчики плывут. Файл пересобирается после
каждого обхода, вёрстка его просто читает.

Фильтр попадает в спецификацию, только если он осмысленный:
поле заполнено у большинства машин и значения реально различают товар
(см. MIN_FILL и MIN_VALUES). Поэтому, например, «цвет салона» сюда не попадает —
API отдаёт его у 0.01% лотов.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from store import Store, now_iso

# Порог заполненности: ниже — фильтр не показываем, он введёт в заблуждение
# («нашлось 3 машины» вместо «данных нет»).
MIN_FILL = 0.5

# Пороги отсечения «длинного хвоста». Узкие значения не помогают выбрать,
# а панель фильтров раздувают: чекбокс «газ (18 машин)» из 83 тысяч — это шум.
MIN_SHARE = 0.001        # значение enum: не реже 0.1% каталога (~83 машины)
MIN_OPTION_SHARE = 0.05  # опция: не реже 5% машин с загруженной карточкой
MAX_OPTIONS_PER_GROUP = 12
MIN_GROUP_SHARE = 0.05   # группа целиком, если встречается совсем редко

COUNTRY_LABELS = {
    "yuznaya-koreya": "Южная Корея",
    "kitai": "Китай",
    "es-evropa": "Европа",
    "rossiiskaya-federaciya": "Россия (в наличии)",
    "oae": "ОАЭ",
    "kyrgyzstan": "Киргизия",
}

CONDITION_LABELS = {"new": "Новый", "used": "С пробегом"}

# Ползунок по цене на линейной шкале бесполезен: 95% каталога лежит
# в 1.6–11.8 млн при максимуме 151 млн. Поэтому — готовые диапазоны.
PRICE_PRESETS = [
    (0, 1_500_000), (1_500_000, 2_500_000), (2_500_000, 3_500_000),
    (3_500_000, 5_000_000), (5_000_000, 8_000_000), (8_000_000, 12_000_000),
    (12_000_000, None),
]

MILEAGE_PRESETS = [
    (0, 1_000), (1_000, 30_000), (30_000, 60_000),
    (60_000, 100_000), (100_000, None),
]


def money(value: int | None) -> str:
    return "" if value is None else f"{value:,}".replace(",", " ")


class FacetBuilder:
    def __init__(self, store: Any, colors: dict[str, str] | None = None) -> None:
        self.store = store
        # PgStore и Store различаются двумя вещами: стилем подстановки параметров
        # и тем, где лежат опции (в Postgres — массивом в строке лота).
        self.pg = hasattr(store, "schema")
        self.prefix = f"{store.schema}." if self.pg else ""
        self.ph = "%s" if self.pg else "?"
        self.db = store.conn if self.pg else store.db
        self.colors = colors or {}
        self.total = self.rows(f"SELECT COUNT(*) FROM {self.prefix}lots WHERE gone_at IS NULL")[0][0]

    def text(self, column: str) -> str:
        """Сравнение с пустой строкой: в Postgres числовые колонки нужно привести."""
        return f"{column}::text" if self.pg else column

    def rows(self, sql: str, params: tuple = ()) -> list:
        if self.pg:
            with self.db.cursor() as cur:
                cur.execute(sql, params)
                return cur.fetchall()
        return self.db.execute(sql, params).fetchall()

    def _fill_ratio(self, column: str) -> float:
        n = self.rows(
            f"SELECT COUNT(*) FROM {self.prefix}lots "
            f"WHERE gone_at IS NULL AND {column} IS NOT NULL AND {self.text(column)} != ''"
        )[0][0]
        return n / self.total if self.total else 0.0

    def enum(
        self,
        key: str,
        column: str,
        label: str,
        labels: dict[str, str] | None = None,
        hint: str | None = None,
    ) -> dict[str, Any] | None:
        """Фильтр-список: страна, топливо, коробка, привод, цвет."""
        fill = self._fill_ratio(column)
        if fill < MIN_FILL:
            return None

        rows = self.rows(
            f"SELECT {column} AS v, COUNT(*) AS n FROM {self.prefix}lots "
            f"WHERE gone_at IS NULL AND {column} IS NOT NULL AND {self.text(column)} != '' "
            f"GROUP BY v ORDER BY n DESC"
        )

        floor = max(3, int(self.total * MIN_SHARE))
        values = []
        for row in rows:
            if row[1] < floor:
                continue
            raw = str(row[0])
            values.append({
                "value": raw,
                "label": (labels or {}).get(raw, self.colors.get(raw.upper(), raw)),
                "count": row[1],
            })
        if len(values) < 2:
            return None

        facet = {"key": key, "column": column, "type": "checkbox", "label": label, "values": values}
        if hint:
            facet["hint"] = hint
        return facet

    def brands(self) -> dict[str, Any]:
        """Марка + вложенные модели. 129 марок и 1346 моделей списком не показать."""
        rows = self.rows(
            f"SELECT brand_code, brand, COUNT(*) n FROM {self.prefix}lots "
            f"WHERE gone_at IS NULL AND brand_code IS NOT NULL "
            f"GROUP BY brand_code, brand ORDER BY n DESC"
        )

        floor = max(3, int(self.total * MIN_SHARE))
        brands = []
        for row in rows:
            if row[2] < floor:
                continue
            models = self.rows(
                f"SELECT model_code, model, COUNT(*) n FROM {self.prefix}lots "
                f"WHERE gone_at IS NULL AND brand_code = {self.ph} AND model_code IS NOT NULL "
                f"GROUP BY model_code, model HAVING COUNT(*) >= {self.ph} ORDER BY n DESC",
                (row[0], max(3, floor // 10)),
            )
            brands.append({
                "value": row[0],
                "label": row[1],
                "count": row[2],
                "models": [
                    {"value": m[0], "label": (m[1] or "").strip(), "count": m[2]} for m in models
                ],
            })

        return {
            "key": "brand",
            "type": "search-tree",
            "label": "Марка и модель",
            "hint": "Список длинный — нужен поиск по названию, а не простой перечень",
            "values": brands,
        }

    def range_facet(
        self, key: str, column: str, label: str, presets: list[tuple[int, int | None]],
        unit: str = "", as_money: bool = False,
    ) -> dict[str, Any]:
        """Диапазон с готовыми интервалами вместо линейного ползунка."""
        row = self.rows(
            f"SELECT MIN({column}), MAX({column}) FROM {self.prefix}lots "
            f"WHERE gone_at IS NULL AND {column} IS NOT NULL AND {column} > 0"
        )[0]

        buckets = []
        for low, high in presets:
            if high is None:
                count = self.rows(
                    f"SELECT COUNT(*) FROM {self.prefix}lots "
                    f"WHERE gone_at IS NULL AND {column} >= {self.ph}", (low,)
                )[0][0]
                text = f"от {money(low) if as_money else low}{unit}"
            else:
                count = self.rows(
                    f"SELECT COUNT(*) FROM {self.prefix}lots WHERE gone_at IS NULL "
                    f"AND {column} >= {self.ph} AND {column} < {self.ph}", (low, high),
                )[0][0]
                text = (
                    f"до {money(high) if as_money else high}{unit}" if low == 0
                    else f"{money(low) if as_money else low} – {money(high) if as_money else high}{unit}"
                )
            buckets.append({"from": low, "to": high, "label": text, "count": count})

        return {
            "key": key, "column": column, "type": "range", "label": label,
            "min": row[0], "max": row[1], "unit": unit, "buckets": buckets,
        }

    def option_groups(self) -> list[dict[str, Any]]:
        """
        Опции по группам — содержимое раздела «Все параметры».

        В Postgres опции лежат массивом `option_ids` в строке лота (отдельная
        таблица связей занимала 193 МБ против 13), поэтому там разворачиваем
        массив через `unnest`. В SQLite остаётся таблица `lot_options`.
        """
        if self.pg:
            sql = (
                f"SELECT o.id, o.name, o.group_title, COUNT(*) n "
                f"FROM {self.prefix}lots l, unnest(l.option_ids) AS oid "
                f"JOIN {self.prefix}options o ON o.id = oid "
                f"WHERE l.gone_at IS NULL "
                f"GROUP BY o.id, o.name, o.group_title ORDER BY o.group_title, n DESC"
            )
            detail_done = self.rows(
                f"SELECT COUNT(*) FROM {self.prefix}lots "
                f"WHERE detail_fetched AND gone_at IS NULL"
            )[0][0] or 1
        else:
            sql = (
                "SELECT o.id, o.name, o.group_title, COUNT(*) n "
                "FROM lot_options lo JOIN options o ON o.id = lo.option_id "
                "JOIN lots l ON l.id = lo.lot_id AND l.gone_at IS NULL "
                "GROUP BY o.id ORDER BY o.group_title, n DESC"
            )
            detail_done = self.rows(
                "SELECT COUNT(*) FROM lots WHERE detail_fetched = 1 AND gone_at IS NULL"
            )[0][0] or 1

        floor = int(detail_done * MIN_OPTION_SHARE)
        groups: dict[str, list[dict[str, Any]]] = {}
        covered: dict[str, int] = {}
        for row in self.rows(sql):
            if row[3] < floor:
                continue
            title = row[2] or "Прочее"
            groups.setdefault(title, []).append(
                {"id": row[0], "label": row[1], "count": row[3],
                 "share": round(row[3] / detail_done * 100)}
            )
            covered[title] = max(covered.get(title, 0), row[3])

        result = []
        for title, options in groups.items():
            # Группа вроде «Основные опции» — 40 пунктов на 97 машин — только мешает.
            if covered.get(title, 0) < detail_done * MIN_GROUP_SHARE:
                continue
            result.append({
                "title": title,
                "options": options[:MAX_OPTIONS_PER_GROUP],
                "totalOptions": min(len(options), MAX_OPTIONS_PER_GROUP),
            })
        return sorted(result, key=lambda g: -len(g["options"]))

    def build(self) -> dict[str, Any]:
        detail_done = self.rows(
            f"SELECT COUNT(*) FROM {self.prefix}lots WHERE detail_fetched"
            + ("" if self.pg else " = 1") + " AND gone_at IS NULL"
        )[0][0]

        basic = [
            self.enum("country", "country_code", "Страна", COUNTRY_LABELS),
            self.brands(),
            self.range_facet("price", "price_individual", "Цена", PRICE_PRESETS, " ₽", as_money=True),
            self.range_facet("mileage", "mileage", "Пробег", MILEAGE_PRESETS, " км"),
            self.enum(
                "body", "body_type", "Тип кузова",
                hint="извлечён из строки поколения; у 34% каталога данных нет — "
                     "фильтр должен сужать выборку, а не прятать машины без кузова",
            ),
            self.enum("condition", "condition", "Состояние", CONDITION_LABELS),
            self.enum("fuel", "fuel", "Двигатель"),
            self.enum("transmission", "transmission", "Коробка передач"),
            self.enum("drive", "drive", "Привод"),
        ]

        advanced = [
            self.enum("year", "year", "Год выпуска"),
            self.enum(
                "color", "color_exterior", "Цвет кузова",
                hint="в базе HEX, подписи берутся из справочника цветов",
            ),
            self.enum(
                "delivery", "delivery_time", "Срок доставки",
                hint="почти повторяет страну; полезно как «в наличии» (0 дней) против «под заказ»",
            ),
        ]

        skipped = [
            {
                "field": "color_interior", "label": "Цвет салона",
                "reason": f"API отдаёт значение у 0.01% лотов ({self._fill_ratio('color_interior')*100:.2f}%), "
                          "и значения нечитаемые (any, black). Фильтр построить нельзя.",
            },
            {
                "field": "equipment", "label": "Комплектация",
                "reason": "3326 уникальных строк вида «1.5L petrol at 150hp» — это текст, а не категория. "
                          "Годится для показа в карточке, не для чекбоксов.",
            },
            {
                "field": "description", "label": "Описание",
                "reason": "заполнено у 0.9% лотов — ни фильтровать, ни показывать нечего.",
            },
        ]

        return {
            "generatedAt": now_iso(),
            "totalLots": self.total,
            "detailFetched": detail_done,
            "note": (
                "Счётчики опций считаются только по лотам с загруженной карточкой "
                f"({detail_done} из {self.total}). После завершения докачки пересоберите файл."
            ),
            "basic": [f for f in basic if f],
            "advanced": [f for f in advanced if f],
            "optionGroups": self.option_groups(),
            "skipped": skipped,
        }


def build_facets(store: Store, refs_path: Path | None = None) -> dict[str, Any]:
    colors: dict[str, str] = {}
    if refs_path and refs_path.exists():
        try:
            refs = json.loads(refs_path.read_text(encoding="utf-8"))
            for color in refs.get("colors", []):
                if color.get("hex") and color.get("name"):
                    colors[color["hex"].upper()] = color["name"]
        except (json.JSONDecodeError, OSError):
            pass
    colors.setdefault("MULTI", "Комбинированный")
    return FacetBuilder(store, colors).build()
