"""
Поисковые подсказки Яндекса — черновая проверка формулировок.

Зачем. Список из 144 посадочных страниц собран по наличию товара: «модель от
200 машин, марка от 300». О том, что люди на самом деле ищут, там нет ни слова.
Настоящие цифры даёт Вордстат, но его API требует аккаунта Директа с активной
кампанией. Подсказки — то, что можно посмотреть сегодня и бесплатно.

Что это даёт и чего не даёт. Подсказки показывают, как люди **формулируют**
запрос: порядок выдачи отражает популярность, поэтому видно, говорят «авто»
или «автомобиль», «из Кореи» или «из Южной Кореи». Абсолютных частот здесь нет
и быть не может — за ними в Вордстат.

Ручка недокументированная, та же, что подсказывает в строке поиска. Ходим
редко и с паузой.

    python3 suggest.py            # все проверки
    python3 suggest.py --region 51  # Самарская область
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request

ENDPOINT = "https://suggest.yandex.ru/suggest-ff.cgi"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"
DELAY = 0.35

# Регионы Яндекса: 213 — Москва, 51 — Самара и область, 0 — вся Россия.
SAMARA = 51


def suggest(part: str, region: int | None = None, limit: int = 10) -> list[str]:
    params = {"part": part, "uil": "ru", "v": "4", "sn": str(limit)}
    if region:
        params["lr"] = str(region)
    url = f"{ENDPOINT}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as error:  # noqa: BLE001 — черновой инструмент, падать целиком незачем
        print(f"  ! {part}: {error}", file=sys.stderr)
        return []
    # Ответ вида ["запрос", ["подсказка", ...]]; иногда подсказка — список.
    items = payload[1] if len(payload) > 1 and isinstance(payload[1], list) else []
    return [item[0] if isinstance(item, list) else str(item) for item in items]


# Как люди начинают фразу. Отсюда видно, какое слово и какая страна побеждают.
PREFIXES = [
    "авто из ",
    "автомобиль из ",
    "машина из ",
    "пригнать авто из ",
    "авто под заказ из ",
    "купить авто из ",
    "авто из кор",
    "авто из кит",
    "авто из евр",
    "авто из японии или ",
]

# Наши формулировки против возможных альтернатив.
PHRASINGS = [
    "авто из кореи",
    "авто из южной кореи",
    "автомобили из кореи",
    "машины из кореи",
    "пригнать авто из кореи",
    "авто из кореи под заказ",
    "заказать авто из кореи",
    "авто из китая",
    "авто из китая под заказ",
    "электромобиль из китая",
    "новые авто из китая",
    "авто из европы",
    "авто из германии",
]

# Марки: проверяем, дописывают ли люди страну к марке вообще.
BRANDS = ["kia из ", "киа из ", "бмв из ", "hyundai из ", "тойота из ", "чери из "]

# Местное — домен и салон в Тольятти.
LOCAL = ["авто из кореи тольятти", "пригнать авто тольятти", "авто под заказ тольятти", "автосалон тольятти"]


def block(title: str, queries: list[str], region: int | None, limit: int = 8) -> None:
    print(f"\n## {title}\n")
    for query in queries:
        items = suggest(query, region, limit)
        print(f"### «{query}»")
        if items:
            for index, item in enumerate(items, 1):
                print(f"{index}. {item}")
        else:
            print("— подсказок нет")
        print()
        time.sleep(DELAY)


def main() -> None:
    parser = argparse.ArgumentParser(description="Поисковые подсказки Яндекса")
    parser.add_argument("--region", type=int, default=None, help=f"код региона, например {SAMARA} — Самара")
    args = parser.parse_args()

    where = f"регион {args.region}" if args.region else "вся Россия"
    print(f"# Подсказки Яндекса — {where}")

    block("Как начинают фразу", PREFIXES, args.region)
    block("Наши формулировки и соседние", PHRASINGS, args.region)
    block("Марка плюс страна", BRANDS, args.region)
    block("Местные запросы", LOCAL, args.region)


if __name__ == "__main__":
    main()
