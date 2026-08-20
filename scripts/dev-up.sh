#!/usr/bin/env bash
# Поднимает весь проект локально в Docker.
#
# Почему скрипт, а не `docker compose up --build`: сборка фронта заранее строит
# 136 посадочных страниц и ходит за данными в бэкенд. Значит бэкенд должен быть
# поднят ДО сборки фронта, а compose собирает всё разом и падает на этом шаге.
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Файлы окружения отдаём compose, а не читаем сами: в них есть значения
# с пробелами и угловыми скобками (`EMAIL_FROM="TIGLEV.COM <...>"`),
# на которых обычный `source` спотыкается.
ENVS=()
[ -f Backend/.env ] && ENVS+=(--env-file Backend/.env)
[ -f Frontend/.env.local ] && ENVS+=(--env-file Frontend/.env.local)
dc() { docker compose "${ENVS[@]}" "$@"; }

# 3000 часто занят локальным `npm run dev` — тогда берём соседний порт,
# чтобы оба варианта могли работать одновременно.
WEB_PORT=3000
while lsof -ti:"$WEB_PORT" >/dev/null 2>&1; do WEB_PORT=$((WEB_PORT + 1)); done
export WEB_PORT
[ "$WEB_PORT" != "3000" ] && echo "     порт 3000 занят, беру $WEB_PORT"

echo "1/3  поднимаю бэкенд (база — Neon)"
dc up -d --build backend
until curl -sf -m 2 http://localhost:4000/health >/dev/null 2>&1; do sleep 2; done
echo "     бэкенд отвечает"

echo "2/3  собираю фронт (строит 136 посадочных страниц, займёт пару минут)"
dc build frontend

echo "3/3  поднимаю фронт"
dc up -d frontend
until curl -sf -m 3 -o /dev/null "http://localhost:$WEB_PORT/" 2>/dev/null; do sleep 2; done

echo
echo "  сайт     http://localhost:$WEB_PORT"
echo "  бэкенд   http://localhost:4000/health"
echo
echo "  ВНИМАНИЕ: база боевая (Neon). Отправленная здесь форма создаст"
echo "  настоящую заявку, а переход в мессенджер — настоящее уведомление в бота."
echo
echo "  остановить:  docker compose down"
