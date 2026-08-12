#!/usr/bin/env python3
"""
Тесты хранилища. Запуск: python3 test_store.py

Проверяется в первую очередь то, что при ошибке портит данные молча:
снятие лотов с продажи и затирание полей карточки данными из списка.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from store import Store, now_iso

PASSED: list[str] = []
FAILED: list[str] = []


def check(condition: bool, title: str, detail: str = "") -> None:
    (PASSED if condition else FAILED).append(title)
    mark = "ok  " if condition else "FAIL"
    print(f"  [{mark}] {title}" + (f" — {detail}" if detail and not condition else ""))


def lot(lot_id: int, **overrides) -> dict:
    record = {
        "id": lot_id,
        "brand": "KIA",
        "brandCode": "kia",
        "model": "Sorento",
        "modelCode": "sorento",
        "year": 2020,
        "mileage": 50000,
        "priceIndividual": 3_000_000,
        "cover": f"https://example.test/{lot_id}.webp",
        "seller": {"source": "encar", "type": "official_dealer", "countryName": "Корея"},
        "updatedAt": "2026-08-01 10:00:00",
    }
    record.update(overrides)
    return record


def test_sweep_marks_missing_as_gone(store: Store) -> None:
    print("\nобход помечает пропавшие лоты снятыми")
    first_sweep = store.start_run("sweep")
    store.upsert_list([lot(i) for i in range(1, 101)], first_sweep)
    check(store.count_live() == 100, "100 лотов записаны", f"получено {store.count_live()}")

    # Второй обход: лоты 96..100 исчезли из выдачи (проданы).
    second_sweep = store.start_run("sweep")
    store.upsert_list([lot(i) for i in range(1, 96)], second_sweep)
    gone, note = store.finish_sweep(second_sweep, seen=95)

    check(gone == 5, "снято ровно 5 лотов", f"снято {gone} ({note})")
    check(store.count_live() == 95, "в продаже осталось 95", f"осталось {store.count_live()}")
    check(store.count_all() == 100, "физически ничего не удалено", f"всего {store.count_all()}")


def test_partial_sweep_is_refused(store: Store) -> None:
    print("\nоборванный обход НЕ снимает каталог с продажи")
    live_before = store.count_live()

    # Сеть отвалилась, собрали 10 лотов из 95 — это явно сбой, а не распродажа.
    broken_sweep = store.start_run("sweep")
    store.upsert_list([lot(i) for i in range(1, 11)], broken_sweep)
    gone, note = store.finish_sweep(broken_sweep, seen=10)

    check(gone == 0, "снятие заблокировано", f"снято {gone}")
    check(store.count_live() == live_before, "каталог не пострадал", f"было {live_before}, стало {store.count_live()}")
    check("пропущено" in note, "причина объяснена в логе", note)


def test_returning_lot_is_revived(store: Store) -> None:
    print("\nвернувшийся в продажу лот снова становится живым")
    gone_ids = [row[0] for row in store.db.execute("SELECT id FROM lots WHERE gone_at IS NOT NULL")]
    check(bool(gone_ids), "есть снятые лоты для проверки")
    if not gone_ids:
        return

    revived = gone_ids[0]
    store.upsert_list([lot(revived, priceIndividual=2_800_000)], store.start_run("fresh"))
    row = store.db.execute("SELECT gone_at, price_individual FROM lots WHERE id = ?", (revived,)).fetchone()

    check(row["gone_at"] is None, "пометка о снятии снята")
    check(row["price_individual"] == 2_800_000, "новая цена записана", str(row["price_individual"]))


def test_list_does_not_wipe_detail(store: Store) -> None:
    print("\nобход списка не затирает данные карточки")
    detailed = {
        **lot(500),
        "generation": "IV поколение",
        "description": "Полная комплектация",
        "deliveryTime": 45,
        "country": "Корея",
        "isForeign": True,
        "images": [f"https://example.test/500-{i}.webp" for i in range(5)],
    }
    store.upsert_detail([detailed], store.start_run("detail"))

    before = store.db.execute("SELECT generation, description, delivery_time FROM lots WHERE id = 500").fetchone()
    check(before["generation"] == "IV поколение", "карточка записана")
    check(len(list(store.db.execute("SELECT 1 FROM images WHERE lot_id = 500"))) == 5, "5 фото записаны")

    # Обычный обход списка знает только базовые поля.
    store.upsert_list([lot(500, priceIndividual=3_500_000)], store.start_run("sweep"))
    after = store.db.execute(
        "SELECT generation, description, delivery_time, price_individual, detail_fetched "
        "FROM lots WHERE id = 500"
    ).fetchone()

    check(after["generation"] == "IV поколение", "поколение уцелело", str(after["generation"]))
    check(after["description"] == "Полная комплектация", "описание уцелело", str(after["description"]))
    check(after["delivery_time"] == 45, "срок доставки уцелел", str(after["delivery_time"]))
    check(after["price_individual"] == 3_500_000, "цена обновилась", str(after["price_individual"]))
    check(after["detail_fetched"] == 1, "лот не вернулся в очередь на карточку")
    check(
        len(list(store.db.execute("SELECT 1 FROM images WHERE lot_id = 500"))) == 5,
        "галерея уцелела",
    )


def test_pending_queue(store: Store) -> None:
    print("\nочередь на загрузку карточек")
    pending = store.pending_detail_ids()
    check(500 not in pending, "лот с карточкой не в очереди")
    check(all(row[0] is None for row in store.db.execute(
        "SELECT gone_at FROM lots WHERE id IN (%s)" % ",".join(map(str, pending[:20] or [0]))
    )), "снятые лоты в очередь не попадают")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        with Store(Path(tmp) / "test.db") as store:
            test_sweep_marks_missing_as_gone(store)
            test_partial_sweep_is_refused(store)
            test_returning_lot_is_revived(store)
            test_list_does_not_wipe_detail(store)
            test_pending_queue(store)

    print(f"\n{'=' * 50}")
    print(f"пройдено {len(PASSED)}, провалено {len(FAILED)}")
    if FAILED:
        for title in FAILED:
            print(f"  FAIL: {title}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
