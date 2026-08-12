"""
Генератор данных для посадочных страниц каталога.

Задача SEO здесь необычная: сами объявления — копия carclick.ru (а туда они попали
с che168 и encar). Массово отдавать 84 тысячи карточек в индекс нельзя, это ровно
тот случай, против которого у Google отдельная политика. Конкурировать за
«Toyota Camry купить» с carclick, avito и auto.ru тоже бессмысленно.

Зато у нас есть то, чего нет ни у кого: сведённые в одну базу предложения из трёх
стран. Отсюда считается сравнение цен на одну модель по странам — «BMW X3 из Китая
на 3.5 млн дешевле, чем из Европы». Это ответ на вопрос, который покупатель реально
задаёт, и это расчёт, а не перепечатка, поэтому дубликатом быть не может.

Файл отдаёт данные для ~150 страниц: страна+модель, страна+марка и сегменты.
Пересобирается после каждого обхода — цены и остатки меняются.

    python3 carclick.py --target pg seo --out seo.json
"""

from __future__ import annotations

from typing import Any

from store import now_iso

# Порог: ниже этого числа машин страница будет полупустой и в индексе только вредит.
MIN_MODEL_LOTS = 200
MIN_BRAND_LOTS = 300
# Медиану по стране считаем на выборке от этого размера.
MIN_YEAR_LOTS = 8
# Модель попадает в сравнение, если совпало хотя бы столько лет выпуска.
MIN_MATCHED_YEARS = 2
# Разница дороже этого множителя = под одним именем разные машины, а не выгода.
MAX_PLAUSIBLE_RATIO = 2.0

COUNTRIES = {
    "yuznaya-koreya": {"name": "Корея", "genitive": "Кореи", "slug": "korei"},
    "kitai": {"name": "Китай", "genitive": "Китая", "slug": "kitaya"},
    "es-evropa": {"name": "Европа", "genitive": "Европы", "slug": "evropy"},
    "rossiiskaya-federaciya": {"name": "Россия", "genitive": "России", "slug": "rossii"},
}

# Сегменты — запросы, которые задают отдельно от марки.
SEGMENTS = [
    ("novye", "Новые автомобили под заказ", "condition = 'new'"),
    ("v-nalichii", "Автомобили в наличии в России", "country_code = 'rossiiskaya-federaciya'"),
    ("elektromobili", "Электромобили под заказ", "fuel = 'электро'"),
    ("gibridy", "Гибриды под заказ", "fuel = 'гибрид'"),
    ("vnedorozhniki", "Внедорожники под заказ", "body_type = 'Внедорожник'"),
    ("do-2-mln", "Автомобили до 2 млн рублей", "price_individual < 2000000"),
    ("polnyy-privod", "Автомобили с полным приводом", "drive = '4WD'"),
    ("bez-probega", "Автомобили с пробегом до 30 000 км", "mileage < 30000"),
]


def money(value: Any) -> str:
    return "" if value is None else f"{int(value):,}".replace(",", " ")


def million(value: Any) -> str:
    """4 812 996 -> «4.8 млн» — для заголовков, где важна краткость."""
    return "" if value is None else f"{value / 1_000_000:.1f}".replace(".", ",") + " млн"


class SeoBuilder:
    def __init__(self, store: Any) -> None:
        self.store = store
        self.schema = getattr(store, "schema", None)
        self.prefix = f"{self.schema}." if self.schema else ""
        self.pg = self.schema is not None

    def rows(self, sql: str, params: tuple = ()) -> list:
        if self.pg:
            with self.store.conn.cursor() as cur:
                cur.execute(sql, params)
                return cur.fetchall()
        return self.store.db.execute(sql, params).fetchall()

    def median_sql(self, column: str) -> str:
        """У SQLite нет percentile_cont — там довольствуемся средним."""
        if self.pg:
            return f"percentile_cont(0.5) WITHIN GROUP (ORDER BY {column})"
        return f"AVG({column})"

    # ------------------------------------------------------------ статистика

    def stats(self, where: str, params: tuple = ()) -> dict[str, Any]:
        row = self.rows(
            f"SELECT COUNT(*), MIN(price_individual), MAX(price_individual), "
            f"{self.median_sql('price_individual')}, MIN(year), MAX(year), "
            f"AVG(mileage) FROM {self.prefix}lots "
            f"WHERE gone_at IS NULL AND price_individual > 0 AND ({where})",
            params,
        )[0]
        return {
            "count": row[0],
            "priceMin": int(row[1]) if row[1] else None,
            "priceMax": int(row[2]) if row[2] else None,
            "priceMedian": int(row[3]) if row[3] else None,
            "yearFrom": row[4],
            "yearTo": row[5],
            "mileageAvg": int(row[6]) if row[6] else None,
        }

    # ------------------------------------------------- сравнение по странам

    def comparisons(self) -> list[dict[str, Any]]:
        """
        Медианная цена одной модели по странам — главный уникальный контент.

        Считается ПО ГОДАМ ВЫПУСКА, а не по модели целиком. Причина: под одним
        `model_code` лежат разные машины. У «BMW 2 Series» в Китае это 3.0 л
        на 530 л.с., а в Корее в ту же модель попадают дешёвые версии — сравнение
        медиан «в лоб» давало разницу втрое и утверждение «из Кореи дешевле
        на 8.6 млн», которого в реальности нет. Сопоставляем одинаковые годы,
        берём медиану погодовых разниц.

        Плюс отсекаем случаи, где состав комплектаций всё же разъехался:
        если цены отличаются более чем в `MAX_PLAUSIBLE_RATIO` раз, это почти
        наверняка разные машины под одним названием, а не выгодная страна.
        """
        rows = self.rows(
            f"SELECT brand, brand_code, model, model_code, year, country_code, COUNT(*) n, "
            f"{self.median_sql('price_individual')} med "
            f"FROM {self.prefix}lots "
            f"WHERE gone_at IS NULL AND price_individual > 0 AND model_code IS NOT NULL "
            f"AND year IS NOT NULL "
            f"GROUP BY brand, brand_code, model, model_code, year, country_code "
            f"HAVING COUNT(*) >= {MIN_YEAR_LOTS}"
        )

        # (модель, год) -> {страна: (count, median)}
        by_year: dict[tuple, dict] = {}
        titles: dict[tuple, tuple] = {}
        for brand, brand_code, model, model_code, year, country, count, median in rows:
            key = (brand_code, model_code)
            titles[key] = (brand, (model or "").strip())
            by_year.setdefault((key, year), {})[country] = (count, int(median))

        # Собираем погодовые разницы по каждой модели.
        per_model: dict[tuple, list] = {}
        for (key, year), countries in by_year.items():
            if len(countries) < 2:
                continue
            prices = {c: v[1] for c, v in countries.items()}
            cheapest = min(prices, key=prices.get)
            dearest = max(prices, key=prices.get)
            if prices[cheapest] <= 0:
                continue
            ratio = prices[dearest] / prices[cheapest]
            if ratio > MAX_PLAUSIBLE_RATIO:
                continue  # под одним именем разные машины
            per_model.setdefault(key, []).append({
                "year": year,
                "cheapest": cheapest,
                "gap": prices[dearest] - prices[cheapest],
                "prices": prices,
                "lots": {c: v[0] for c, v in countries.items()},
            })

        result = []
        for key, years in per_model.items():
            if len(years) < MIN_MATCHED_YEARS:
                continue
            brand, model = titles[key]
            # Страна-победитель — та, что дешевле в большинстве годов.
            wins: dict[str, int] = {}
            for entry in years:
                wins[entry["cheapest"]] = wins.get(entry["cheapest"], 0) + 1
            cheapest = max(wins, key=wins.get)
            consistent = [e for e in years if e["cheapest"] == cheapest]
            if len(consistent) < len(years) / 2:
                continue  # выгода скачет от года к году — вывода нет
            gaps = sorted(e["gap"] for e in consistent)
            gap = gaps[len(gaps) // 2]

            result.append({
                "brand": brand, "brandCode": key[0],
                "model": model, "modelCode": key[1],
                "cheapest": cheapest,
                "gap": gap,
                "matchedYears": len(years),
                "agreeingYears": len(consistent),
                "byYear": sorted(years, key=lambda e: -e["year"])[:6],
                "headline": (
                    f"{brand} {model} из {COUNTRIES[cheapest]['genitive']} "
                    f"дешевле примерно на {money(gap)} ₽"
                ),
                "method": (
                    f"Сравнение по одинаковым годам выпуска ({len(years)} лет), "
                    f"медиана разниц. Комплектации внутри модели различаются, "
                    f"поэтому цифра ориентировочная."
                ),
            })

        return sorted(result, key=lambda e: -e["gap"])

    # ----------------------------------------------------------- страницы

    def model_pages(self, compare: dict[tuple, dict]) -> list[dict[str, Any]]:
        rows = self.rows(
            f"SELECT country_code, brand, brand_code, model, model_code, COUNT(*) n "
            f"FROM {self.prefix}lots WHERE gone_at IS NULL AND model_code IS NOT NULL "
            f"GROUP BY country_code, brand, brand_code, model, model_code "
            f"HAVING COUNT(*) >= {MIN_MODEL_LOTS} ORDER BY n DESC"
        )
        pages = []
        for country, brand, brand_code, model, model_code, count in rows:
            meta = COUNTRIES.get(country)
            if not meta:
                continue
            model = (model or "").strip()
            stats = self.stats(
                "country_code = %s AND model_code = %s" if self.pg
                else "country_code = ? AND model_code = ?",
                (country, model_code),
            )
            page = {
                "type": "country-model",
                "slug": f"{brand_code}/{model_code}/iz-{meta['slug']}",
                "title": f"{brand} {model} из {meta['genitive']} — {count} автомобилей под заказ",
                "h1": f"{brand} {model} из {meta['genitive']}",
                "filter": {"country": country, "brand": brand_code, "model": model_code},
                "count": count,
                "stats": stats,
            }
            page["description"] = (
                f"{count} предложений {brand} {model} из {meta['genitive']}. "
                f"Цены от {money(stats['priceMin'])} ₽, медиана {money(stats['priceMedian'])} ₽. "
                f"Доставка под заказ, проверка перед отправкой."
            )
            comparison = compare.get((brand_code, model_code))
            if comparison:
                page["comparison"] = comparison
            pages.append(page)
        return pages

    def brand_pages(self) -> list[dict[str, Any]]:
        rows = self.rows(
            f"SELECT country_code, brand, brand_code, COUNT(*) n FROM {self.prefix}lots "
            f"WHERE gone_at IS NULL AND brand_code IS NOT NULL "
            f"GROUP BY country_code, brand, brand_code "
            f"HAVING COUNT(*) >= {MIN_BRAND_LOTS} ORDER BY n DESC"
        )
        pages = []
        for country, brand, brand_code, count in rows:
            meta = COUNTRIES.get(country)
            if not meta:
                continue
            stats = self.stats(
                "country_code = %s AND brand_code = %s" if self.pg
                else "country_code = ? AND brand_code = ?",
                (country, brand_code),
            )
            models = self.rows(
                f"SELECT model, COUNT(*) n FROM {self.prefix}lots "
                f"WHERE gone_at IS NULL AND country_code = {'%s' if self.pg else '?'} "
                f"AND brand_code = {'%s' if self.pg else '?'} AND model IS NOT NULL "
                f"GROUP BY model ORDER BY n DESC LIMIT 8",
                (country, brand_code),
            )
            pages.append({
                "type": "country-brand",
                "slug": f"{brand_code}/iz-{meta['slug']}",
                "title": f"{brand} из {meta['genitive']} — {count} автомобилей под заказ",
                "h1": f"{brand} из {meta['genitive']}",
                "description": (
                    f"{count} автомобилей {brand} из {meta['genitive']}. "
                    f"Цены от {money(stats['priceMin'])} до {money(stats['priceMax'])} ₽. "
                    f"Популярные модели: {', '.join((m[0] or '').strip() for m in models[:4])}."
                ),
                "filter": {"country": country, "brand": brand_code},
                "count": count,
                "stats": stats,
                "topModels": [{"name": (m[0] or "").strip(), "count": m[1]} for m in models],
            })
        return pages

    def segment_pages(self) -> list[dict[str, Any]]:
        pages = []
        for slug, title, condition in SEGMENTS:
            stats = self.stats(condition)
            if stats["count"] < MIN_BRAND_LOTS:
                continue
            brands = self.rows(
                f"SELECT brand, COUNT(*) n FROM {self.prefix}lots "
                f"WHERE gone_at IS NULL AND ({condition}) AND brand IS NOT NULL "
                f"GROUP BY brand ORDER BY n DESC LIMIT 6"
            )
            pages.append({
                "type": "segment",
                "slug": slug,
                "title": f"{title} — {stats['count']} предложений",
                "h1": title,
                "description": (
                    f"{stats['count']} автомобилей. Цены от {money(stats['priceMin'])} ₽, "
                    f"медиана {money(stats['priceMedian'])} ₽. "
                    f"Чаще всего: {', '.join(b[0] for b in brands[:4])}."
                ),
                "sqlCondition": condition,
                "count": stats["count"],
                "stats": stats,
                "topBrands": [{"name": b[0], "count": b[1]} for b in brands],
            })
        return pages

    def build(self) -> dict[str, Any]:
        comparisons = self.comparisons()
        by_model = {(c["brandCode"], c["modelCode"]): c for c in comparisons}

        model_pages = self.model_pages(by_model)
        brand_pages = self.brand_pages()
        segment_pages = self.segment_pages()
        total_live = self.rows(
            f"SELECT COUNT(*) FROM {self.prefix}lots WHERE gone_at IS NULL"
        )[0][0]

        return {
            "generatedAt": now_iso(),
            "totalLots": total_live,
            "pages": model_pages + brand_pages + segment_pages,
            "pageCounts": {
                "country-model": len(model_pages),
                "country-brand": len(brand_pages),
                "segment": len(segment_pages),
                "total": len(model_pages) + len(brand_pages) + len(segment_pages),
            },
            # Отдельно: годится для обзорной страницы «откуда дешевле везти».
            "comparisons": comparisons,
            "note": (
                "Карточки товаров массово в индекс не отдавать — они дубликат carclick.ru. "
                "Индексируются страницы из этого файла; уникальность им даёт сравнение "
                "цен по странам, которого нет ни у одного конкурента."
            ),
        }


def build_seo(store: Any) -> dict[str, Any]:
    return SeoBuilder(store).build()
