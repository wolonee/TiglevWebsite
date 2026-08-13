#!/usr/bin/env python3
"""
Парсер и синхронизатор каталога CarClick (carclick.ru).

Данные берутся из их публичного JSON API, HTML не трогаем вообще.
Хранилище — SQLite (см. store.py), JSON только на выгрузку.

Команды:
    sweep    полный обход каталога: добавить новые, обновить цены, снять проданные
    fresh    быстрый добор новинок (1-2 запроса) — для частого расписания
    detail   дозагрузка карточек: полная галерея, поколение, комплектация
    refs     справочники марок/цветов/параметров для фильтров витрины
    stats    что накоплено в базе
    export   выгрузка в JSON/JSONL для витрины (с реферальными ссылками)

Типовой цикл:
    python3 carclick.py sweep                       # раз в сутки, ~2 мин
    python3 carclick.py fresh                       # раз в час, 1-2 запроса
    python3 carclick.py detail --concurrency 8      # фоном, добирает карточки

Про сортировку (важно). Витрина CarClick листает каталог как `created_at desc` —
новые сверху. Обходить каталог целиком с такой сортировкой нельзя: пока идёт обход,
сверху добавляются свежие лоты, выдача съезжает вниз, и на стыках страниц теряются
позиции. Выяснилось, что API принимает только `sort=created_at`, а любое другое
значение молча игнорирует и отдаёт порядок по `id` возрастанию — проверено на
стабильность. Поэтому `sweep` не передаёт `sort` вовсе: новые лоты с большими id
дописываются в конец, и обход ничего не теряет. `fresh`, наоборот, использует
`created_at desc` — ему нужна именно голова списка.
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from store import Store, body_type_from_generation, now_iso

API = "https://carclick.ru/api/v1"
SITE = "https://carclick.ru"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
OUT_DIR = Path(__file__).parent / "data"

# Реферальная метка для арбитража. Партнёрки пока нет — как только CarClick выдаст
# код, достаточно выставить эти переменные окружения, переобход каталога не нужен:
# ссылка собирается при выгрузке, а в базе лежит только id лота.
REF_PARAM = os.environ.get("CARCLICK_REF_PARAM", "r")
REF_CODE = os.environ.get("CARCLICK_REF_CODE", "")

# Поля продавца содержат e-mail, телефон и bcrypt-хеш пароля дилера — это дыра
# на стороне CarClick. Сохраняем только безобидное; фильтрацию не убирать.
SELLER_SAFE_KEYS = ("source", "type", "country_id")


def open_store(args: argparse.Namespace):
    """
    Хранилище по флагу --target.

    `PgStore` повторяет интерфейс `Store`, поэтому команды обхода не знают,
    с чем работают, и все защиты внутри них одинаковы для обоих вариантов.
    """
    if getattr(args, "target", "sqlite") == "pg":
        from pgsync import PgStore, read_database_url

        env_path = Path(args.env) if args.env and Path(args.env).exists() else None
        return PgStore(read_database_url(env_path), schema=args.pg_schema)
    return Store(args.db)


def lot_url(lot_id: int, ref_code: str | None = None) -> str:
    code = REF_CODE if ref_code is None else ref_code
    url = f"{SITE}/marketplace/{lot_id}"
    if code:
        url += "?" + urllib.parse.urlencode({REF_PARAM: code})
    return url


class ProxyPool:
    """
    Пул выходных узлов прокси.

    CarClick отбивает адреса GitHub, поэтому запросы идут через прокси. Пакет даёт
    150 портов — это 150 разных выходных узлов, и они не равноценны: часть выдаёт
    зарубежные адреса, которые CarClick блокирует (проверено — порт 10000 из списка
    «MoscowTest (RU)» выходил в Швецию и получал 403), часть временно без узла (503).

    Поэтому: порт выбирается случайно на каждый прогон, а при отказе помечается
    плохим до конца прогона и берётся другой. Один мёртвый узел перестаёт
    что-либо значить.

    Формат `PROXY_URL` — одна строка, записи через запятую или перевод строки.
    В записи допустим диапазон портов:

        http://user:pass@proxy.example:10000-10149
        http://user:pass@a.example:8080, http://user:pass@b.example:8080
    """

    def __init__(self, spec: str) -> None:
        self.urls = self._expand(spec)
        self.bad: set[str] = set()
        self._openers: dict[str, Any] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _expand(spec: str) -> list[str]:
        urls: list[str] = []
        for chunk in re.split(r"[,\n]", spec or ""):
            chunk = chunk.strip()
            if not chunk:
                continue
            if "://" not in chunk:
                chunk = "http://" + chunk
            match = re.match(r"^(.*:)(\d+)-(\d+)$", chunk)
            if match:
                head, first, last = match.group(1), int(match.group(2)), int(match.group(3))
                urls.extend(f"{head}{port}" for port in range(first, last + 1))
            else:
                urls.append(chunk)
        return urls

    def __bool__(self) -> bool:
        return bool(self.urls)

    def pick(self) -> tuple[str, Any]:
        """Случайный живой узел и готовый opener под него."""
        with self._lock:
            alive = [u for u in self.urls if u not in self.bad] or self.urls
            url = random.choice(alive)
            opener = self._openers.get(url)
            if opener is None:
                opener = urllib.request.build_opener(
                    urllib.request.ProxyHandler({"http": url, "https": url})
                )
                self._openers[url] = opener
            return url, opener

    def penalize(self, url: str) -> None:
        """Узел отказал — до конца прогона его не берём."""
        with self._lock:
            # Если испортились все, забываем метки: лучше пробовать, чем стоять.
            if len(self.bad) + 1 >= len(self.urls):
                self.bad.clear()
            else:
                self.bad.add(url)

    def report(self) -> str:
        return f"узлов {len(self.urls)}, отбраковано {len(self.bad)}"


PROXIES = ProxyPool(os.environ.get("PROXY_URL", ""))


class RateLimiter:
    """Минимальный интервал между запросами на весь пул потоков."""

    def __init__(self, min_interval: float) -> None:
        self._min_interval = min_interval
        self._lock = threading.Lock()
        self._next_at = 0.0

    def wait(self) -> None:
        if self._min_interval <= 0:
            return
        with self._lock:
            now = time.monotonic()
            sleep_for = max(0.0, self._next_at - now)
            self._next_at = max(now, self._next_at) + self._min_interval
        if sleep_for:
            time.sleep(sleep_for)


def get_json(url: str, limiter: RateLimiter, retries: int = 6) -> dict[str, Any]:
    """GET с ретраями и экспоненциальным backoff."""
    last_error: Exception | None = None

    for attempt in range(retries):
        limiter.wait()
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "User-Agent": UA,
                "Referer": f"{SITE}/marketplace",
            },
        )
        # Каждая попытка идёт через свой случайный узел: если предыдущий отказал,
        # повтор через тот же был бы бессмысленным.
        proxy_url, opener = PROXIES.pick() if PROXIES else (None, None)
        try:
            opened = opener.open(request, timeout=30) if opener else urllib.request.urlopen(request, timeout=30)
            with opened as response:
                raw = response.read()
                if response.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                return json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code == 404:  # лот снят с публикации, ретраить нечего
                raise
            # 403 через прокси = узел в чёрном списке CarClick (чаще всего
            # зарубежный), 503 = у прокси нет свободного узла. И то и другое
            # лечится сменой узла, а не ожиданием.
            if proxy_url and error.code in (403, 407, 503):
                PROXIES.penalize(proxy_url)
                backoff = 0.0
            else:
                backoff = 2.0 ** attempt * (3.0 if error.code in (429, 503) else 1.0)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
            last_error = error
            if proxy_url:
                PROXIES.penalize(proxy_url)
            backoff = 2.0 ** attempt

        if attempt < retries - 1:
            time.sleep(backoff + random.uniform(0, 0.4))

    raise RuntimeError(f"не удалось получить {url}: {last_error}")


def list_url(page: int, limit: int, newest_first: bool = False) -> str:
    """
    Страница каталога. `newest_first=False` — порядок по id (устойчив к обходу),
    `True` — `created_at desc`, голова списка со свежими лотами.
    """
    query = {
        "status": "active",
        "showMy": "0",
        "page": str(page),
        "limit": str(limit),
        "priceType": "individual",
        "deliveryTime": "90",
    }
    if newest_first:
        query["sort"] = "created_at"
        query["sortType"] = "desc"
    return f"{API}/market/lots?" + urllib.parse.urlencode(query)


def clean_seller(seller: dict[str, Any] | None) -> dict[str, Any]:
    """Выбрасывает PII продавца, оставляя только полезное для витрины."""
    if not isinstance(seller, dict):
        return {}
    dealer = seller.get("dealer") or {}
    country = dealer.get("country") or {}
    result = {key: dealer.get(key) for key in SELLER_SAFE_KEYS if dealer.get(key) is not None}
    if country.get("name"):
        result["countryName"] = country["name"]
        result["countryCode"] = country.get("code")
    return result


def to_number(value: Any) -> float | int | None:
    if value in (None, "", "-"):
        return None
    try:
        number = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None
    return int(number) if number.is_integer() else number


def normalize_list_item(item: dict[str, Any]) -> dict[str, Any]:
    """Запись из выдачи списка → плоская схема."""
    car = item.get("car") or {}
    cover = car.get("img") or ""
    return {
        "id": item.get("id"),
        "brand": (car.get("mark") or "").strip(),
        "brandCode": car.get("markCode"),
        "model": (car.get("model") or "").strip(),
        "modelCode": car.get("modelCode"),
        "equipment": car.get("equipment"),
        "year": to_number(car.get("year")),
        "month": to_number(car.get("month")),
        "mileage": to_number(item.get("mileage")),
        "fuel": car.get("fuel"),
        "transmission": car.get("transmission"),
        "drive": car.get("drive"),
        "volume": to_number(car.get("volume")),
        "hp": to_number(car.get("hp")),
        "colorExterior": car.get("color"),
        "condition": item.get("type"),
        "countryCode": item.get("countryCode"),
        # currency из списка не берём: он отдаёт CNY при рублёвой цене
        "priceIndividual": to_number(item.get("priceIndividual")),
        "priceIndividualEAEU": to_number(item.get("priceIndividualEAEU")),
        "priceLegal": to_number(item.get("priceLegal")),
        "minScenarioPrice": to_number(item.get("minScenarioPrice")),
        "cover": cover,
        "seller": clean_seller(item.get("seller")),
        "updatedAt": item.get("updatedAt"),
    }


def normalize_detail(detail: dict[str, Any]) -> dict[str, Any]:
    """Карточка лота → та же схема, плюс галерея и доп. поля."""
    gallery = detail.get("gallery") or []
    images = [photo["path"] for photo in gallery if photo.get("path")]
    main = next((photo["path"] for photo in gallery if photo.get("isMain")), None)
    if main and images and images[0] != main:
        images.remove(main)
        images.insert(0, main)

    return {
        "id": detail.get("id"),
        "brand": (detail.get("markName") or "").strip(),
        "brandCode": detail.get("markCode"),
        "model": (detail.get("modelName") or "").strip(),
        "modelCode": detail.get("modelCode"),
        "generation": detail.get("generationName"),
        "bodyType": body_type_from_generation(detail.get("generationName")),
        "equipment": detail.get("complectationName"),
        "options": detail.get("options") or [],
        "year": to_number(detail.get("year")),
        "month": to_number(detail.get("month")),
        "mileage": to_number(detail.get("mileage")),
        "fuel": detail.get("fuelName"),
        "transmission": detail.get("transmissionName"),
        "drive": detail.get("driveName"),
        "volume": to_number(detail.get("volume")),
        "hp": to_number(detail.get("hp")),
        "colorExterior": detail.get("colorExterior"),
        "colorInterior": detail.get("colorInteriorText") or detail.get("colorInterior"),
        "description": detail.get("description"),
        "condition": detail.get("type"),
        "country": detail.get("country"),
        "countryCode": detail.get("countryCode"),
        "isForeign": detail.get("isForeign"),
        "deliveryTime": to_number(detail.get("deliveryTime")),
        "priceIndividual": to_number(detail.get("priceIndividual")),
        "priceIndividualEAEU": to_number(detail.get("priceIndividualEAEU")),
        "priceLegal": to_number(detail.get("priceLegal")),
        "minScenarioPrice": to_number(detail.get("minScenarioPrice")),
        "cover": images[0] if images else None,
        "images": images,
        "seller": clean_seller(detail.get("seller")),
        "updatedAt": detail.get("updatedAt"),
    }


# --------------------------------------------------------------------- команды


def cmd_sweep(args: argparse.Namespace) -> None:
    """Полный обход: новые + изменения цен + снятие проданных."""
    limiter = RateLimiter(args.delay)

    with open_store(args) as store:
        run_id = store.start_run("sweep")
        before_live = store.count_live()

        first = get_json(list_url(1, args.limit), limiter)
        meta = first.get("meta", {})
        total_pages = meta.get("last_page", 1)
        total = meta.get("total", 0)
        pages = min(args.pages, total_pages) if args.pages else total_pages
        print(
            f"каталог CarClick: {total} лотов | страниц по {args.limit}: {total_pages} | обходим: {pages}",
            file=sys.stderr,
        )
        print(f"в базе сейчас: {before_live} в продаже, {store.count_all()} всего\n", file=sys.stderr)

        seen = added = updated = 0
        complete = True

        for page in range(1, pages + 1):
            try:
                payload = first if page == 1 else get_json(list_url(page, args.limit), limiter)
            except Exception as error:  # noqa: BLE001
                print(f"  ! страница {page}: {error}", file=sys.stderr)
                complete = False
                continue

            items = payload.get("data") or []
            if not items:
                break

            records = [normalize_list_item(item) for item in items]
            page_added, page_updated = store.upsert_list(records, run_id)
            seen += len(records)
            added += page_added
            updated += page_updated

            if page % 10 == 0 or page == pages:
                print(f"  стр. {page}/{pages} | увидено {seen} | новых {added}", file=sys.stderr)

        # Снимать с продажи можно только после полного и успешного обхода:
        # иначе оборванная сеть «продаст» половину каталога.
        if not complete:
            gone, note = 0, "обход прошёл с ошибками — снятие пропущено"
        elif args.pages:
            gone, note = 0, "частичный обход (--pages) — снятие пропущено"
        else:
            gone, note = store.finish_sweep(run_id, seen)

        store.finish_run(run_id, seen=seen, added=added, updated=updated, gone=gone, note=note)
        print(f"\nувидено {seen} | новых {added} | обновлено {updated}", file=sys.stderr)
        print(f"{note}", file=sys.stderr)
        print(f"в базе: {store.count_live()} в продаже, {store.count_all()} всего", file=sys.stderr)


def cmd_fresh(args: argparse.Namespace) -> None:
    """Добор новинок с головы списка — дёшево, можно хоть раз в 10 минут."""
    limiter = RateLimiter(args.delay)

    with open_store(args) as store:
        run_id = store.start_run("fresh")
        known = store.known_ids()
        fresh_records: list[dict[str, Any]] = []
        pages_read = 0

        for page in range(1, args.max_pages + 1):
            payload = get_json(list_url(page, args.limit, newest_first=True), limiter)
            items = payload.get("data") or []
            pages_read += 1
            if not items:
                break

            records = [normalize_list_item(item) for item in items]
            unseen = [record for record in records if record["id"] not in known]
            fresh_records.extend(unseen)

            # Дошли до уже известных лотов — дальше только старое.
            if len(unseen) < len(records):
                break

        added = updated = 0
        if fresh_records:
            added, updated = store.upsert_list(fresh_records, run_id)

        store.finish_run(run_id, seen=len(fresh_records), added=added, updated=updated)
        print(
            f"новинки: прочитано страниц {pages_read}, новых лотов {added}"
            + (f" (обновлено {updated})" if updated else ""),
            file=sys.stderr,
        )


def cmd_detail(args: argparse.Namespace) -> None:
    """Дозагрузка карточек для лотов, у которых её ещё нет."""
    with open_store(args) as store:
        todo = store.pending_detail_ids(args.limit_lots)
        if not todo:
            print("все карточки уже загружены", file=sys.stderr)
            return

        run_id = store.start_run("detail")
        print(f"карточек к загрузке: {len(todo)} | потоков {args.concurrency}", file=sys.stderr)

        limiter = RateLimiter(args.delay)
        buffer: list[dict[str, Any]] = []
        gone: list[int] = []
        counters = {"ok": 0, "gone": 0, "fail": 0}
        started = time.monotonic()
        stop = threading.Event()

        # Соединение SQLite принадлежит потоку, который его создал (check_same_thread),
        # поэтому рабочие потоки только качают и возвращают результат, а пишет
        # исключительно главный поток. Заодно не нужен лок вокруг базы.
        def fetch(lot_id: int) -> tuple[str, Any]:
            if stop.is_set():
                return ("skip", lot_id)
            try:
                payload = get_json(f"{API}/market/lots/{lot_id}", limiter)
                return ("ok", normalize_detail(payload.get("data") or payload))
            except urllib.error.HTTPError as error:
                if error.code == 404:  # лот снят с продажи — нормальный ответ
                    return ("gone", lot_id)
                return ("fail", f"HTTP {error.code}")
            except Exception as error:  # noqa: BLE001 — один битый лот не роняет проход
                return ("fail", str(error)[:80])

        def flush(force: bool = False) -> None:
            """Пишем пачками: 83k одиночных транзакций SQLite не переживёт бодро."""
            nonlocal buffer, gone
            if not force and len(buffer) < args.batch:
                return
            if buffer:
                store.upsert_detail(buffer, run_id)
                buffer = []
            if gone:
                store.mark_gone(gone)
                gone = []

        # Предохранитель. Длинный прогон идёт без присмотра, и если CarClick
        # закроет API, забанит нас или просто ляжет, продолжать нет смысла:
        # мы потратим часы, получим нули и вдобавок будем долбить упавший сервис.
        # Считаем ошибки подряд — одиночные сбои сбрасывают счётчик, вал останавливает.
        streak = 0
        last_reason = ""

        try:
            with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
                for index, (status, payload) in enumerate(pool.map(fetch, todo), start=1):
                    if status == "ok":
                        buffer.append(payload)
                        counters["ok"] += 1
                        streak = 0
                    elif status == "gone":
                        gone.append(payload)
                        counters["gone"] += 1
                        streak = 0
                    elif status == "fail":
                        counters["fail"] += 1
                        streak += 1
                        last_reason = payload
                    else:  # skip — прогон уже остановлен
                        continue

                    flush()

                    if streak >= args.max_failures and not stop.is_set():
                        stop.set()
                        print(
                            f"\n  ОСТАНОВКА: {streak} ошибок подряд (последняя: {last_reason}).\n"
                            f"  Похоже, API недоступен или нас ограничили. Загруженное сохранено —\n"
                            f"  повторный запуск `detail` продолжит с места остановки.",
                            file=sys.stderr,
                        )

                    if index % 500 == 0:
                        rate = index / max(time.monotonic() - started, 1e-6)
                        left = (len(todo) - index) / max(rate, 1e-6)
                        print(
                            f"  {index}/{len(todo)} | {rate:.1f} лот/с | осталось ~{left / 60:.0f} мин "
                            f"| снято {counters['gone']} | ошибок {counters['fail']}",
                            file=sys.stderr,
                        )
        finally:
            flush(force=True)

        store.finish_run(
            run_id, seen=len(todo), updated=counters["ok"], gone=counters["gone"], errors=counters["fail"]
        )
        elapsed = (time.monotonic() - started) / 60
        print(
            f"\nготово за {elapsed:.1f} мин: {counters['ok']} карточек, "
            f"{counters['gone']} снято, {counters['fail']} ошибок",
            file=sys.stderr,
        )


def cmd_refs(args: argparse.Namespace) -> None:
    """Справочники для фильтров витрины."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    limiter = RateLimiter(args.delay)
    sources = {
        "marks": f"{API}/auto/marks?actual=true",
        "colors": f"{API}/auto/colors",
        "modification_parameters": f"{API}/auto/modification-parameters?isFullTransmission=0",
        "countries": f"{API}/countries",
    }
    bundle: dict[str, Any] = {}
    for name, url in sources.items():
        try:
            payload = get_json(url, limiter)
            # Часть справочников отдаёт голый массив, часть — обёртку {"data": [...]}.
            bundle[name] = payload.get("data", payload) if isinstance(payload, dict) else payload
            size = len(bundle[name]) if isinstance(bundle[name], list) else "obj"
            print(f"  {name}: {size}", file=sys.stderr)
        except Exception as error:  # noqa: BLE001
            print(f"  ! {name}: {error}", file=sys.stderr)

    out_path = OUT_DIR / "references.json"
    out_path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nсправочники → {out_path}", file=sys.stderr)


def cmd_reindex_options(args: argparse.Namespace) -> None:
    """Раскладывает опции уже загруженных лотов по таблицам для быстрой фильтрации."""
    with Store(args.db) as store:
        lots, links = store.reindex_options()
        print(f"разобрано лотов: {lots}, связей с опциями: {links}", file=sys.stderr)
        facets = store.option_facets(limit=15)
        if facets:
            print("\nсамые частые опции:", file=sys.stderr)
            for _, name, group, count in facets:
                print(f"  {count:>6}  {name}  ({group})", file=sys.stderr)


def cmd_facets(args: argparse.Namespace) -> None:
    """Собирает спецификацию фильтров для витрины."""
    from facets import build_facets

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = Path(args.out) if args.out else OUT_DIR / "facets.json"
    with open_store(args) as store:
        spec = build_facets(store, OUT_DIR / "references.json")
    out_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"основных фильтров:   {len(spec['basic'])}", file=sys.stderr)
    print(f"дополнительных:      {len(spec['advanced'])}", file=sys.stderr)
    print(f"групп опций:         {len(spec['optionGroups'])}", file=sys.stderr)
    print(f"не построено:        {len(spec['skipped'])} (см. skipped в файле)", file=sys.stderr)
    print(f"\n{out_path}", file=sys.stderr)


def cmd_pgdump(args: argparse.Namespace) -> None:
    """SQL-дамп каталога для PostgreSQL/Neon."""
    from pgdump import dump

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = Path(args.out) if args.out else OUT_DIR / ("carclick.sql.gz" if not args.plain else "carclick.sql")
    with Store(args.db) as store:
        counts = dump(store, out_path, compress=not args.plain)

    for table, n in counts.items():
        print(f"  {table:16} {n:>9} строк", file=sys.stderr)
    size = out_path.stat().st_size / 1024 / 1024
    print(f"\n{out_path}  ({size:.0f} МБ)", file=sys.stderr)
    print(f'\nзаливка:  gunzip -c {out_path.name} | psql "$DATABASE_URL"', file=sys.stderr)


def cmd_prune(args: argparse.Namespace) -> None:
    """Чистит галереи и опции у давно проданных лотов."""
    with open_store(args) as store:
        result = store.prune_gone(args.older_than)
        print(
            f"почищено лотов: {result['lots']} "
            f"(удалено {result['images']} фото, {result['options']} связей с опциями)",
            file=sys.stderr,
        )
        if result["lots"]:
            print("для возврата места запустите VACUUM", file=sys.stderr)


def cmd_seo(args: argparse.Namespace) -> None:
    """Данные для посадочных страниц каталога."""
    from seo import build_seo

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = Path(args.out) if args.out else OUT_DIR / "seo.json"
    with open_store(args) as store:
        spec = build_seo(store)
    out_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

    counts = spec["pageCounts"]
    print(f"страниц «страна+модель»: {counts['country-model']}", file=sys.stderr)
    print(f"страниц «страна+марка»:  {counts['country-brand']}", file=sys.stderr)
    print(f"страниц-сегментов:       {counts['segment']}", file=sys.stderr)
    print(f"всего:                   {counts['total']}", file=sys.stderr)
    print(f"сравнений цен по странам: {len(spec['comparisons'])}", file=sys.stderr)
    print(f"\n{out_path}", file=sys.stderr)


def cmd_stats(args: argparse.Namespace) -> None:
    with Store(args.db) as store:
        if not store.count_all():
            print("база пуста — запусти `sweep`", file=sys.stderr)
            return

        print("=== база ===")
        for key, value in store.stats().items():
            print(f"  {key}: {value}")

        prices = store.price_bounds()
        if prices["min"] is not None:
            fmt = lambda n: f"{n:,}".replace(",", " ")  # noqa: E731
            print(f"\n=== цены (в продаже) ===")
            print(f"  от {fmt(prices['min'])} ₽ до {fmt(prices['max'])} ₽ | средняя {fmt(prices['avg'])} ₽")

        for column, title in (
            ("brand", "марки"),
            ("country_code", "страны"),
            ("fuel", "топливо"),
            ("transmission", "коробка"),
            ("drive", "привод"),
            ("condition", "состояние"),
        ):
            rows = store.breakdown(column, limit=8)
            if rows:
                print(f"\n=== {title} ===")
                print("  " + ", ".join(f"{name or '?'}: {count}" for name, count in rows))

        print("\n=== последние обходы ===")
        for row in store.db.execute(
            "SELECT kind, started_at, seen, added, updated, gone, errors, note "
            "FROM sync_runs ORDER BY id DESC LIMIT 5"
        ):
            note = f" — {row['note']}" if row["note"] else ""
            print(
                f"  {row['started_at'][:16]} {row['kind']:7} "
                f"увидено {row['seen']}, новых {row['added']}, снято {row['gone']}{note}"
            )


def cmd_export(args: argparse.Namespace) -> None:
    """Выгрузка для витрины. Реферальная метка подставляется здесь."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = Path(args.out) if args.out else OUT_DIR / ("lots.jsonl" if args.jsonl else "lots.json")
    ref = args.ref if args.ref is not None else REF_CODE

    if ref:
        print(f"реферальная метка: ?{REF_PARAM}={ref}", file=sys.stderr)
    else:
        print("реферальной метки нет — ссылки выгружаются чистыми", file=sys.stderr)

    with Store(args.db) as store, out_path.open("w", encoding="utf-8") as out:
        count = 0
        if not args.jsonl:
            out.write("[\n")
        for record in store.iter_export(live_only=not args.include_gone):
            record["url"] = lot_url(record["id"], ref)
            line = json.dumps(record, ensure_ascii=False)
            if args.jsonl:
                out.write(line + "\n")
            else:
                out.write(("," if count else "") + "  " + line + "\n")
            count += 1
        if not args.jsonl:
            out.write("]\n")

    size = out_path.stat().st_size / 1024 / 1024
    print(f"выгружено {count} лотов ({size:.1f} МБ) → {out_path}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Парсер и синхронизатор каталога CarClick")
    parser.add_argument("--db", default=None, help="путь к базе (по умолчанию data/carclick.db)")
    parser.add_argument(
        "--target", choices=("sqlite", "pg"), default="sqlite",
        help="куда писать: локальный SQLite или PostgreSQL (для расписания)",
    )
    parser.add_argument("--pg-schema", default="catalog", help="схема в PostgreSQL")
    parser.add_argument("--env", default="../Backend/.env", help="откуда взять DATABASE_URL")
    parser.add_argument("--delay", type=float, default=0.15, help="минимальный интервал между запросами, с")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_sweep = subparsers.add_parser("sweep", help="полный обход каталога")
    p_sweep.add_argument("--limit", type=int, default=500, help="лотов на страницу (макс. 500)")
    p_sweep.add_argument("--pages", type=int, default=0, help="ограничить число страниц (0 = все)")
    p_sweep.set_defaults(func=cmd_sweep)

    p_fresh = subparsers.add_parser("fresh", help="добор новинок с головы списка")
    p_fresh.add_argument("--limit", type=int, default=100, help="лотов на страницу")
    p_fresh.add_argument("--max-pages", type=int, default=5, help="предел страниц за прогон")
    p_fresh.set_defaults(func=cmd_fresh)

    p_detail = subparsers.add_parser("detail", help="дозагрузка карточек")
    p_detail.add_argument("--concurrency", type=int, default=4, help="параллельных запросов")
    p_detail.add_argument("--limit-lots", type=int, default=0, help="ограничить число лотов (0 = все)")
    p_detail.add_argument("--batch", type=int, default=100, help="размер пачки записи в базу")
    p_detail.add_argument(
        "--max-failures", type=int, default=50,
        help="остановиться после стольких ошибок подряд (защита от бана/падения API)",
    )
    p_detail.set_defaults(func=cmd_detail)

    p_refs = subparsers.add_parser("refs", help="справочники для фильтров")
    p_refs.set_defaults(func=cmd_refs)

    p_reidx = subparsers.add_parser("reindex-options", help="разложить опции для фильтрации")
    p_reidx.set_defaults(func=cmd_reindex_options)

    p_facets = subparsers.add_parser("facets", help="спецификация фильтров для витрины")
    p_facets.add_argument("--out", default=None, help="путь к файлу")
    p_facets.set_defaults(func=cmd_facets)

    p_pg = subparsers.add_parser("pgdump", help="SQL-дамп для PostgreSQL/Neon")
    p_pg.add_argument("--out", default=None, help="путь к файлу")
    p_pg.add_argument("--plain", action="store_true", help="без gzip")
    p_pg.set_defaults(func=cmd_pgdump)

    p_prune = subparsers.add_parser("prune", help="убрать фото/опции у проданных лотов")
    p_prune.add_argument("--older-than", type=int, default=30, help="снятых с продажи более N дней назад")
    p_prune.set_defaults(func=cmd_prune)

    p_seo = subparsers.add_parser("seo", help="данные для посадочных страниц")
    p_seo.add_argument("--out", default=None, help="путь к файлу")
    p_seo.set_defaults(func=cmd_seo)

    p_stats = subparsers.add_parser("stats", help="сводка по базе")
    p_stats.set_defaults(func=cmd_stats)

    p_export = subparsers.add_parser("export", help="выгрузка в JSON для витрины")
    p_export.add_argument("--out", default=None, help="путь к файлу")
    p_export.add_argument("--jsonl", action="store_true", help="построчный JSONL вместо массива")
    p_export.add_argument("--ref", default=None, help="реферальный код (иначе из CARCLICK_REF_CODE)")
    p_export.add_argument("--include-gone", action="store_true", help="включить снятые с продажи")
    p_export.set_defaults(func=cmd_export)

    args = parser.parse_args()
    try:
        args.func(args)
    except KeyboardInterrupt:
        print("\nпрервано — записанное сохранено, запусти команду снова", file=sys.stderr)
        sys.exit(130)


if __name__ == "__main__":
    main()
