# TIGLEV.COM

- `Frontend` — Next.js-сайт и серверный proxy для заявок.
- `Backend` — Vercel-compatible Express API, Telegram webhook и PostgreSQL.

## Локальный запуск через Docker

Скопируйте `.env.example` в `.env`, создайте новый BotFather-токен и два секрета:

```bash
openssl rand -hex 32
```

Передайте Compose переменные backend и frontend из локальных env-файлов:

```bash
docker compose --env-file Backend/.env --env-file Frontend/.env.local up --build
```

Сайт: `http://localhost:3000`

Backend: `http://localhost:4000/health`

Локальный Telegram webhook требует публичный HTTPS-туннель. Без него формы и PostgreSQL работают, но Telegram не сможет отправлять `/start` в локальный backend.

## Размещение на Vercel

Создайте два Vercel Project из одного репозитория:

1. Frontend с Root Directory `Frontend`.
2. Backend с Root Directory `Backend`.

Для Backend подключите Neon Postgres через Vercel Marketplace и добавьте переменные:

```text
DATABASE_URL
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
BACKEND_API_KEY
FRONTEND_ORIGIN=https://ваш-frontend.vercel.app
WEBHOOK_URL=https://ваш-backend.vercel.app
```

Для Frontend добавьте:

```text
BACKEND_URL=https://ваш-backend.vercel.app
BACKEND_API_KEY=тот-же-секрет
```

После первого production-деплоя Backend локально выполните:

```bash
cd Backend
vercel env pull .env --yes
npm run webhook:setup
```

Команда создаст таблицу `telegram_subscribers` и зарегистрирует endpoint `/api/telegram` в Telegram. Пользователь подписывается командой `/start`, отписывается командой `/stop`.
