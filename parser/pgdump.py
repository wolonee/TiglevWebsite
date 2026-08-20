"""
Выгрузка базы каталога в SQL-дамп для PostgreSQL (Neon).

Почему дампом, а не прямой заливкой: у витрины боевая база на Neon, и туда же
ходит существующий backend. Дамп даёт возможность посмотреть, что именно
заливается, залить в отдельную схему и откатиться, не трогая рабочие таблицы.

Данные пишутся через `COPY ... FROM stdin` — это на порядок быстрее,
чем миллион отдельных INSERT.

Заливка:
    gunzip -c carclick.sql.gz | psql "$DATABASE_URL"

Всё создаётся в схеме `catalog`, поэтому пересечься с таблицами backend'а
дамп не может. Первым делом он делает `DROP SCHEMA catalog CASCADE`,
то есть повторная заливка просто заменяет каталог целиком.
"""

from __future__ import annotations

import gzip
import re
from pathlib import Path
from typing import Any, Iterator, TextIO

from store import Store

# Только определения таблиц, без создания и удаления схемы. Отдельно — чтобы
# синхронизация (pgsync) могла переиспользовать их, физически не имея у себя
# ни одной разрушающей команды: витрина читает из этой схемы в тот же момент.
TABLES_DDL = """
CREATE TABLE image_prefixes (
    id     integer PRIMARY KEY,
    prefix text NOT NULL UNIQUE
);

CREATE TABLE lots (
    id                    bigint PRIMARY KEY,
    source                text NOT NULL DEFAULT 'carclick',  -- carclick | own
    brand                 text,
    brand_code            text,
    model                 text,
    model_code            text,
    generation            text,
    equipment             text,
    year                  integer,
    month                 integer,
    mileage               integer,
    fuel                  text,
    transmission          text,
    drive                 text,
    volume                double precision,
    hp                    integer,
    body_type             text,
    color_exterior        text,
    color_interior        text,
    description           text,
    condition             text,
    country               text,
    country_code          text,
    is_foreign            boolean,
    delivery_time         integer,
    price_individual      bigint,
    price_individual_eaeu bigint,
    price_legal           bigint,
    min_scenario_price    bigint,
    cover                 text,
    -- Галерея и опции лежат массивами прямо в строке лота, а не отдельными
    -- таблицами. На 83k лотов дочерние таблицы занимали 343 МБ против 68 МБ
    -- у массивов: строка Postgres несёт 24 байта служебных данных, а полезных
    -- в связи «лот-опция» всего 12. Все фото лота приходят из одного источника
    -- (проверено), поэтому префикс один на лот.
    image_prefix_id       integer REFERENCES image_prefixes(id),
    image_paths           text[],
    option_ids            integer[],
    seller_source         text,
    seller_type           text,
    seller_country        text,
    detail_fetched        boolean NOT NULL DEFAULT false,
    source_updated_at     text,
    first_seen_at         timestamptz NOT NULL,
    last_seen_at          timestamptz NOT NULL,
    last_seen_run         bigint,
    gone_at               timestamptz
);

CREATE TABLE options (
    id          integer PRIMARY KEY,
    name        text NOT NULL,
    group_title text
);
"""

# Полная пересборка — только для pgdump/pgload, когда витрина ещё не запущена
# или простой допустим. Для суточной синхронизации это НЕЛЬЗЯ: несколько десятков
# секунд каталог не существует.
# Имена таблиц проставляются с указанием схемы, `SET search_path` не используется:
# Neon работает через пулер, и `SET` протекает между клиентами — однажды соединение
# backend'а получило чужой search_path и создало свои таблицы в схеме каталога.
SCHEMA_SQL = (
    """
DROP SCHEMA IF EXISTS catalog CASCADE;
CREATE SCHEMA catalog;
"""
    + re.sub(r"CREATE TABLE (\w+)", r"CREATE TABLE catalog.\1", TABLES_DDL)
    .replace("REFERENCES image_prefixes(", "REFERENCES catalog.image_prefixes(")
)

# Индексы создаются ПОСЛЕ загрузки данных: строить их на пустой таблице
# и потом наполнять — заметно медленнее.
INDEXES_SQL = """
SET LOCAL search_path TO catalog;
CREATE INDEX idx_lots_live    ON lots (gone_at) WHERE gone_at IS NULL;
CREATE INDEX idx_lots_brand   ON lots (brand_code, model_code);
CREATE INDEX idx_lots_price   ON lots (price_individual);
CREATE INDEX idx_lots_year    ON lots (year);
CREATE INDEX idx_lots_country ON lots (country_code);
CREATE INDEX idx_lots_source  ON lots (source);
CREATE INDEX idx_lots_body    ON lots (body_type);
-- Поиск «есть такие опции» по массиву: option_ids @> ARRAY[50,42]
CREATE INDEX idx_lots_options_gin ON lots USING gin (option_ids);

-- Лента каталога всегда фильтрует «в продаже» и листает по id вниз (keyset).
CREATE INDEX idx_lots_feed ON lots (id DESC) WHERE gone_at IS NULL;

ANALYZE;
"""

# Колонки, попадающие в дамп. Порядок обязан совпадать с COPY.
LOT_COLUMNS = [
    "id", "source", "brand", "brand_code", "model", "model_code", "generation",
    "equipment", "year", "month", "mileage", "fuel", "transmission", "drive",
    "volume", "hp", "body_type", "color_exterior", "color_interior", "description", "condition",
    "image_prefix_id", "image_paths", "option_ids",
    "country", "country_code", "is_foreign", "delivery_time", "price_individual",
    "price_individual_eaeu", "price_legal", "min_scenario_price", "cover",
    "seller_source", "seller_type", "seller_country", "detail_fetched",
    "source_updated_at", "first_seen_at", "last_seen_at", "last_seen_run", "gone_at",
]
BOOLEAN_COLUMNS = {"is_foreign", "detail_fetched"}


def copy_value(value: Any, boolean: bool = False) -> str:
    """Значение в формате текстового COPY: NULL это \\N, спецсимволы экранируются."""
    if value is None:
        return r"\N"
    if boolean:
        return "t" if value else "f"
    text = str(value)
    return (
        text.replace("\\", "\\\\")
        .replace("\t", "\\t")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
    )


def copy_block(
    out: TextIO, table: str, columns: list[str], rows: Iterator[Any],
    booleans: set[str] | None = None,
) -> int:
    booleans = booleans or set()
    out.write(f"COPY catalog.{table} ({', '.join(columns)}) FROM stdin;\n")
    count = 0
    for row in rows:
        out.write(
            "\t".join(copy_value(row[column], column in booleans) for column in columns) + "\n"
        )
        count += 1
    out.write("\\.\n\n")
    return count


def lot_rows(store: Store) -> Iterator[dict[str, Any]]:
    """
    Строки лотов с уже собранными массивами фото и опций.

    В SQLite они остаются отдельными таблицами (там нет проблемы с накладными
    расходами на строку), а в Postgres едут массивами — см. комментарий в схеме.
    """
    images: dict[int, tuple[int, list[str]]] = {}
    for lot_id, prefix_id, path in store.db.execute(
        "SELECT lot_id, prefix_id, path FROM images ORDER BY lot_id, position"
    ):
        entry = images.setdefault(lot_id, (prefix_id, []))
        entry[1].append(path)

    options: dict[int, list[int]] = {}
    for lot_id, option_id in store.db.execute(
        "SELECT lo.lot_id, lo.option_id FROM lot_options lo "
        "JOIN options o ON o.id = lo.option_id ORDER BY lo.lot_id, lo.option_id"
    ):
        options.setdefault(lot_id, []).append(option_id)

    plain = [c for c in LOT_COLUMNS if c not in ("image_prefix_id", "image_paths", "option_ids")]
    for row in store.db.execute(f"SELECT {', '.join(plain)} FROM lots"):
        record = {column: row[column] for column in plain}
        prefix_id, paths = images.get(row["id"], (None, None))
        record["image_prefix_id"] = prefix_id
        record["image_paths"] = paths
        record["option_ids"] = options.get(row["id"])
        yield record


def array_literal(values: list[Any] | None) -> str:
    """Массив в текстовом формате COPY: {"a","b"} с экранированием."""
    if values is None:
        return r"\N"
    parts = []
    for value in values:
        text = str(value).replace("\\", "\\\\").replace('"', '\\"')
        parts.append(f'"{text}"')
    return "{" + ",".join(parts) + "}"


def dump(store: Store, out_path: Path, compress: bool = True) -> dict[str, int]:
    opener = (
        (lambda: gzip.open(out_path, "wt", encoding="utf-8", compresslevel=6))
        if compress
        else (lambda: out_path.open("w", encoding="utf-8"))
    )
    counts: dict[str, int] = {}

    with opener() as out:
        out.write("-- Каталог CarClick для tiglev.com\n")
        out.write('-- Заливка: gunzip -c этот_файл.gz | psql "$DATABASE_URL"\n\n')
        out.write("BEGIN;\n")
        out.write(SCHEMA_SQL)

        counts["image_prefixes"] = copy_block(
            out, "image_prefixes", ["id", "prefix"],
            store.db.execute("SELECT id, prefix FROM image_prefixes"),
        )
        counts["options"] = copy_block(
            out, "options", ["id", "name", "group_title"],
            store.db.execute("SELECT id, name, group_title FROM options"),
        )

        out.write(f"COPY catalog.lots ({', '.join(LOT_COLUMNS)}) FROM stdin;\n")
        written = 0
        for record in lot_rows(store):
            fields = []
            for column in LOT_COLUMNS:
                value = record[column]
                if column in ("image_paths", "option_ids"):
                    fields.append(array_literal(value))
                else:
                    fields.append(copy_value(value, column in BOOLEAN_COLUMNS))
            out.write("\t".join(fields) + "\n")
            written += 1
        out.write("\\.\n\n")
        counts["lots"] = written

        out.write(INDEXES_SQL)
        out.write("COMMIT;\n")

    return counts
