"""
Заливка каталога из SQLite прямо в PostgreSQL (Neon) через COPY.

В отличие от `pgdump` (который делает файл для psql), эта команда льёт потоком
и замеряет размер базы после каждой таблицы. Смысл замера: каталог едет в ту же
базу Neon, где живут заявки и Telegram-подписчики работающего сайта. Если упереться
в квоту тарифа, Neon переводит базу в read-only — то есть сломается приём заявок.
Поэтому заливка останавливается сама, не доходя до лимита (`--limit-mb`).

Каталог создаётся в отдельной схеме `catalog`, рабочие таблицы не затрагиваются;
откат — `DROP SCHEMA catalog CASCADE`.

Требуется psycopg (в venv рядом: .venv/bin/python).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Callable

from pgdump import INDEXES_SQL, LOT_COLUMNS, SCHEMA_SQL, lot_rows
from store import Store

# Порядок важен: lots ссылается на image_prefixes, поэтому справочники первыми.
TABLES: list[tuple[str, list[str], str]] = [
    ("image_prefixes", ["id", "prefix"], "SELECT id, prefix FROM image_prefixes"),
    ("options", ["id", "name", "group_title"], "SELECT id, name, group_title FROM options"),
]

BOOLEAN_COLUMNS = {"is_foreign", "detail_fetched", "is_main"}
# В SQLite это ISO-строки; пустые не должны попасть в timestamptz.
TIMESTAMP_COLUMNS = {"first_seen_at", "last_seen_at", "gone_at"}


def read_database_url(env_path: Path) -> str:
    text = env_path.read_text(encoding="utf-8")
    match = re.search(r"^DATABASE_URL=(.+)$", text, re.M)
    if not match:
        raise RuntimeError(f"в {env_path} нет DATABASE_URL")
    url = match.group(1).strip().strip('"').strip("'")
    if "[SENSITIVE]" in url or "://" not in url:
        raise RuntimeError(f"в {env_path} строка подключения недоступна")
    return url


def convert(value: Any, column: str) -> Any:
    if value is None:
        return None
    if column in BOOLEAN_COLUMNS:
        return bool(value)
    if column in TIMESTAMP_COLUMNS and not str(value).strip():
        return None
    return value


def db_size_mb(cursor: Any) -> float:
    cursor.execute("SELECT pg_database_size(current_database())")
    return cursor.fetchone()[0] / 1024 / 1024


def load(
    store: Store,
    url: str,
    limit_mb: float,
    progress: Callable[[str], None] = print,
) -> dict[str, Any]:
    import psycopg

    report: dict[str, Any] = {"tables": {}, "stopped": None}

    with psycopg.connect(url, connect_timeout=30) as conn:
        cursor = conn.cursor()
        start = db_size_mb(cursor)
        report["before_mb"] = round(start, 1)
        progress(f"до заливки: {start:.1f} МБ, потолок {limit_mb:.0f} МБ")

        cursor.execute(SCHEMA_SQL)
        conn.commit()
        progress("схема catalog создана")

        for table, columns, query in TABLES:
            statement = f"COPY catalog.{table} ({', '.join(columns)}) FROM STDIN"
            written = 0
            with cursor.copy(statement) as copy:
                for row in store.db.execute(query):
                    copy.write_row([convert(row[column], column) for column in columns])
                    written += 1
            conn.commit()
            report["tables"][table] = written
            progress(f"  {table:16} {written:>9} строк")

        # Лоты идут последними и сразу с массивами фото и опций.
        statement = f"COPY catalog.lots ({', '.join(LOT_COLUMNS)}) FROM STDIN"
        written = 0
        with cursor.copy(statement) as copy:
            for record in lot_rows(store):
                copy.write_row([convert(record[column], column) for column in LOT_COLUMNS])
                written += 1
                if written % 20000 == 0:
                    progress(f"  lots {written:>9} строк...")
        conn.commit()
        report["tables"]["lots"] = written
        size = db_size_mb(cursor)
        progress(f"  {'lots':16} {written:>9} строк | база: {size:.1f} МБ")

        if size > limit_mb:
            report["stopped"] = "lots"
            progress(f"\nСТОП: {size:.1f} МБ превышает потолок {limit_mb:.0f} МБ")
            progress("откат: DROP SCHEMA catalog CASCADE")
            return report

        progress("строю индексы...")
        cursor.execute(INDEXES_SQL)
        conn.commit()

        final = db_size_mb(cursor)
        report["after_mb"] = round(final, 1)
        report["catalog_mb"] = round(final - start, 1)
        progress(f"\nготово: база {final:.1f} МБ (каталог занял {final - start:.1f} МБ)")

    return report
