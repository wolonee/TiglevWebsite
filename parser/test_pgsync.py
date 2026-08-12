#!/usr/bin/env python3
"""
Тесты хранилища на PostgreSQL. Запуск: .venv/bin/python test_pgsync.py

Работают в отдельной схеме `catalog_selftest`, которая создаётся и удаляется
внутри теста — рабочая схема витрины не затрагивается.

Проверяется то же, что и у SQLite-версии, плюс главное отличие: синхронизация
обновляет строки на месте и НИКОГДА не удаляет схему, потому что из неё
одновременно читает работающая витрина.
"""

from __future__ import annotations

import sys
from pathlib import Path

from pgsync import PgStore, read_database_url

SCHEMA = "catalog_selftest"
PASSED: list[str] = []
FAILED: list[str] = []


def check(condition: bool, title: str, detail: str = "") -> None:
    (PASSED if condition else FAILED).append(title)
    print(f"  [{'ok  ' if condition else 'FAIL'}] {title}" + (f" — {detail}" if detail and not condition else ""))


def lot(lot_id: int, **overrides) -> dict:
    record = {
        "id": lot_id, "brand": "KIA", "brandCode": "kia", "model": "Sorento",
        "modelCode": "sorento", "year": 2020, "mileage": 50000,
        "priceIndividual": 3_000_000, "cover": "https://example.test/x.webp",
        "seller": {"source": "encar", "type": "official_dealer", "countryName": "Корея"},
        "updatedAt": "2026-08-01T10:00:00Z",
    }
    record.update(overrides)
    return record


def test_sweep_marks_gone(store: PgStore) -> None:
    print("\nобход помечает пропавшие лоты снятыми")
    run1 = store.start_run("sweep")
    store.upsert_list([lot(i) for i in range(1, 101)], run1)
    check(store.count_live() == 100, "100 лотов записаны", str(store.count_live()))

    run2 = store.start_run("sweep")
    store.upsert_list([lot(i) for i in range(1, 96)], run2)
    gone, note = store.finish_sweep(run2, seen=95)
    check(gone == 5, "снято ровно 5", f"снято {gone} ({note})")
    check(store.count_live() == 95, "в продаже 95", str(store.count_live()))
    check(store.count_all() == 100, "строки не удалены", str(store.count_all()))


def test_partial_sweep_refused(store: PgStore) -> None:
    print("\nоборванный обход НЕ снимает каталог")
    live = store.count_live()
    run = store.start_run("sweep")
    store.upsert_list([lot(i) for i in range(1, 11)], run)
    gone, note = store.finish_sweep(run, seen=10)
    check(gone == 0, "снятие заблокировано", str(gone))
    check(store.count_live() == live, "каталог не пострадал", f"{live} -> {store.count_live()}")
    check("пропущено" in note, "причина в логе", note)


def test_revive(store: PgStore) -> None:
    print("\nвернувшийся лот снова живой")
    with store.conn.cursor() as cur:
        cur.execute(f"SELECT id FROM {store.schema}.lots WHERE gone_at IS NOT NULL LIMIT 1")
        row = cur.fetchone()
    check(row is not None, "есть снятые лоты")
    if not row:
        return
    store.upsert_list([lot(row[0], priceIndividual=2_800_000)], store.start_run("fresh"))
    with store.conn.cursor() as cur:
        cur.execute(f"SELECT gone_at, price_individual FROM {store.schema}.lots WHERE id = %s", (row[0],))
        gone_at, price = cur.fetchone()
    check(gone_at is None, "пометка снята")
    check(price == 2_800_000, "цена обновлена", str(price))


def test_list_does_not_wipe_detail(store: PgStore) -> None:
    print("\nобход списка не затирает карточку")
    detailed = {
        **lot(500), "generation": "IV (внедорожник)", "description": "Полная",
        "deliveryTime": 45, "country": "Корея", "isForeign": True,
        "images": [f"https://example.test/gallery/{i}.webp" for i in range(5)],
        "options": [{"title": "Салон", "items": [{"id": 50, "name": "Кожаный салон"}]}],
    }
    store.upsert_detail([detailed], store.start_run("detail"))
    with store.conn.cursor() as cur:
        cur.execute(
            f"SELECT generation, description, delivery_time, body_type, "
            f"cardinality(image_paths), cardinality(option_ids) "
            f"FROM {store.schema}.lots WHERE id = 500"
        )
        before = cur.fetchone()
    check(before[0] == "IV (внедорожник)", "карточка записана")
    check(before[3] == "Внедорожник", "кузов извлечён из поколения", str(before[3]))
    check(before[4] == 5, "5 фото", str(before[4]))
    check(before[5] == 1, "1 опция", str(before[5]))

    store.upsert_list([lot(500, priceIndividual=3_500_000)], store.start_run("sweep"))
    with store.conn.cursor() as cur:
        cur.execute(
            f"SELECT generation, description, delivery_time, price_individual, detail_fetched, "
            f"cardinality(image_paths), cardinality(option_ids) "
            f"FROM {store.schema}.lots WHERE id = 500"
        )
        after = cur.fetchone()
    check(after[0] == "IV (внедорожник)", "поколение уцелело", str(after[0]))
    check(after[1] == "Полная", "описание уцелело", str(after[1]))
    check(after[2] == 45, "срок доставки уцелел", str(after[2]))
    check(after[3] == 3_500_000, "цена обновилась", str(after[3]))
    check(after[4] is True, "лот не вернулся в очередь на карточку", str(after[4]))
    check(after[5] == 5, "галерея уцелела", str(after[5]))
    check(after[6] == 1, "опции уцелели", str(after[6]))


def test_pending_queue(store: PgStore) -> None:
    print("\nочередь на карточки")
    pending = store.pending_detail_ids()
    check(500 not in pending, "лот с карточкой не в очереди")
    with store.conn.cursor() as cur:
        cur.execute(
            f"SELECT COUNT(*) FROM {store.schema}.lots "
            f"WHERE id = ANY(%s) AND gone_at IS NOT NULL", (pending[:50] or [0],)
        )
        check(cur.fetchone()[0] == 0, "снятые лоты в очередь не попадают")


def test_no_destructive_sql(store: PgStore) -> None:
    print("\nсинхронизация не содержит разрушающих операций")
    import pgsync
    source = Path(pgsync.__file__).read_text(encoding="utf-8")
    body = source.split('"""', 2)[-1]  # без строки документации
    for danger in ("DROP SCHEMA", "DROP TABLE", "TRUNCATE", "DELETE FROM"):
        check(danger not in body.upper(), f"нет {danger}")


def main() -> int:
    url = read_database_url(Path("../Backend/.env"))
    store = PgStore(url, schema=SCHEMA)
    try:
        with store.conn.cursor() as cur:
            cur.execute(f"TRUNCATE {SCHEMA}.lots, {SCHEMA}.sync_runs RESTART IDENTITY CASCADE")
        store.conn.commit()

        test_sweep_marks_gone(store)
        test_partial_sweep_refused(store)
        test_revive(store)
        test_list_does_not_wipe_detail(store)
        test_pending_queue(store)
        test_no_destructive_sql(store)
    finally:
        with store.conn.cursor() as cur:
            cur.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
        store.conn.commit()
        store.close()

    print(f"\n{'=' * 50}\nпройдено {len(PASSED)}, провалено {len(FAILED)}")
    for title in FAILED:
        print(f"  FAIL: {title}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
