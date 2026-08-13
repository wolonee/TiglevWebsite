"""
Уведомления в Telegram о состоянии синхронизации каталога.

Зачем: каталог обновляется сам, без присмотра. Молчание системы неотличимо
от её смерти — если прокси кончится, а сайт продолжит показывать вчерашние
цены, узнаем об этом от клиента, а не от мониторинга.

Отправляется тем же ботом и тем же подписчикам, что и заявки с сайта
(`public.telegram_subscribers`, кто отправил боту /start).

Два режима:

    python3 notify.py --failed fresh --details "текст ошибки"   # прогон упал
    python3 notify.py --check                                    # плановая проверка

Проверка смотрит на то, что ломается тихо: не устарели ли данные, не кончается
ли пакет прокси, не подходит ли база к лимиту тарифа. Сообщение уходит, только
если есть о чём сказать, — иначе бот молчит и его не начинают игнорировать.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

from pgsync import read_database_url

# Пакет прокси покупается на месяц — про него легче всего забыть.
# Дата окончания задаётся секретом, предупреждаем заранее.
PROXY_WARN_DAYS = 10
# Neon Free даёт 512 МБ на проект, и в этой же базе живут заявки с сайта.
DB_WARN_MB = 400
DB_CRITICAL_MB = 460
# Каталог обновляется каждые 4 часа; сутки без обновления — уже поломка.
STALE_HOURS = 26


def send(text: str, token: str, chat_ids: list[int]) -> int:
    """Шлёт сообщение всем подписчикам. Возвращает, скольким дошло."""
    delivered = 0
    for chat_id in chat_ids:
        payload = urllib.parse.urlencode({
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": "true",
        }).encode()
        request = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage", data=payload
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                if json.loads(response.read()).get("ok"):
                    delivered += 1
        except Exception as error:  # noqa: BLE001 — один недоступный чат не должен ронять рассылку
            print(f"  чат {chat_id}: {error}", file=sys.stderr)
    return delivered


def subscribers(conn) -> list[int]:
    with conn.cursor() as cur:
        # Схема указана явно: search_path в пуле Neon бывает чужим.
        cur.execute("SELECT chat_id FROM public.telegram_subscribers")
        return [row[0] for row in cur.fetchall()]


def collect_problems(conn) -> list[str]:
    """Что стоит сообщить. Пустой список = всё в порядке, молчим."""
    problems: list[str] = []
    with conn.cursor() as cur:
        # 1. Свежесть данных — главный признак тихой поломки.
        cur.execute(
            "SELECT kind, started_at, added FROM catalog.sync_runs "
            "WHERE finished_at IS NOT NULL ORDER BY id DESC LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            problems.append("⚠️ Синхронизация ни разу не отработала.")
        else:
            kind, started_at, added = row
            hours = (datetime.now(timezone.utc) - started_at).total_seconds() / 3600
            if hours > STALE_HOURS:
                problems.append(
                    f"🔴 Каталог не обновлялся {hours:.0f} ч. "
                    f"Последний прогон: {kind}, {started_at:%d.%m %H:%M}."
                )

        # 2. Размер базы: при переполнении Neon переводит её в read-only,
        #    и сайт перестаёт принимать заявки.
        cur.execute("SELECT pg_database_size(current_database())/1024.0/1024")
        size = cur.fetchone()[0]
        if size > DB_CRITICAL_MB:
            problems.append(
                f"🔴 База {size:.0f} МБ из 512. Близко к лимиту Neon — "
                f"при переполнении перестанут приниматься заявки. Нужен prune."
            )
        elif size > DB_WARN_MB:
            problems.append(f"⚠️ База {size:.0f} МБ из 512. Пора запустить prune.")

        # 3. Не опустел ли каталог.
        cur.execute("SELECT COUNT(*) FROM catalog.lots WHERE gone_at IS NULL")
        live = cur.fetchone()[0]
        if live < 10_000:
            problems.append(f"🔴 В каталоге всего {live} машин — похоже на сбой обхода.")

    # 4. Прокси: пакет месячный, про него забывают первым делом.
    expires = os.environ.get("PROXY_EXPIRES", "").strip()
    if expires:
        try:
            left = (date.fromisoformat(expires) - date.today()).days
            if left < 0:
                problems.append(f"🔴 Пакет прокси истёк {abs(left)} дн. назад — синхронизация встанет.")
            elif left <= PROXY_WARN_DAYS:
                problems.append(f"⚠️ Пакет прокси заканчивается через {left} дн. ({expires}). Продлите.")
        except ValueError:
            problems.append(f"⚠️ PROXY_EXPIRES задан неверно: {expires!r}, ожидается ГГГГ-ММ-ДД.")

    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Уведомления о синхронизации каталога")
    parser.add_argument("--failed", help="имя упавшей задачи")
    parser.add_argument("--details", default="", help="подробности ошибки")
    parser.add_argument("--check", action="store_true", help="плановая проверка состояния")
    parser.add_argument("--env", default="../Backend/.env")
    args = parser.parse_args()

    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        print("нет TELEGRAM_BOT_TOKEN — уведомления пропущены", file=sys.stderr)
        return 0

    import psycopg

    env_path = Path(args.env) if args.env and Path(args.env).exists() else None
    with psycopg.connect(read_database_url(env_path), connect_timeout=30) as conn:
        chats = subscribers(conn)
        if not chats:
            print("нет подписчиков бота — некому слать", file=sys.stderr)
            return 0

        if args.failed:
            details = (args.details or "").strip()[:600]
            text = (
                f"🔴 <b>Синхронизация каталога упала</b>\n\n"
                f"Задача: <code>{args.failed}</code>\n"
                f"Время: {datetime.now(timezone.utc):%d.%m %H:%M} UTC\n\n"
                f"Чаще всего причина — прокси: кончился трафик, истёк пакет "
                f"или узлы недоступны. Проверьте кабинет proxyma.\n"
            )
            if details:
                text += f"\n<pre>{details}</pre>"
        elif args.check:
            problems = collect_problems(conn)
            if not problems:
                print("всё в порядке, сообщение не отправлено", file=sys.stderr)
                return 0
            text = "<b>Каталог: требуется внимание</b>\n\n" + "\n\n".join(problems)
        else:
            parser.error("нужен --failed или --check")

    delivered = send(text, token, chats)
    print(f"отправлено {delivered} из {len(chats)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
