# TIGLEV.COM

Сайт автосалона на [Next.js 16](https://nextjs.org) + React 19 + Tailwind CSS 4.

## Запуск через Docker (рекомендуется)

Не требует установки Node.js и зависимостей на вашу машину — нужен только Docker.

```bash
docker compose up --build
```

Откройте [http://localhost:3000](http://localhost:3000).

Остановить:

```bash
docker compose down
```

Запуск в фоне — добавьте флаг `-d`: `docker compose up --build -d`.

### Если Docker ещё не установлен

Проверить наличие можно командой `docker --version`. Если команда не найдена — установите Docker:

- **Windows / macOS** — [Docker Desktop](https://www.docker.com/products/docker-desktop/). Скачайте установщик, запустите и следуйте инструкциям, затем откройте приложение Docker Desktop, чтобы движок начал работать.
- **Linux** — [Docker Engine](https://docs.docker.com/engine/install/). Выберите свой дистрибутив и выполните команды из официальной инструкции.
- **macOS (альтернатива)** — [Colima](https://github.com/abtreece/colima) для запуска без Docker Desktop: `brew install colima docker docker-compose`, затем `colima start`.

После установки убедитесь, что всё работает:

```bash
docker --version
docker compose version
```

Обе команды должны вывести номер версии. После этого можно запускать проект командой выше.

## Запуск без Docker

Требуется [Node.js](https://nodejs.org) версии 20 или новее.

Установите зависимости (один раз):

```bash
npm install
```

### Режим разработки

С горячей перезагрузкой при изменении файлов:

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000). Страницы обновляются автоматически при редактировании файлов в `src/`.

### Продакшен-режим

```bash
npm run build
npm start
```

## Структура проекта

- `src/app/` — страницы и layout (App Router)
- `src/components/` — React-компоненты (Header, Footer и др.)
- `public/` — статические файлы (изображения, логотип)
- `Dockerfile`, `docker-compose.yml` — конфигурация Docker

## Полезные команды

| Команда | Описание |
| --- | --- |
| `npm run dev` | Сервер разработки |
| `npm run build` | Сборка для продакшена |
| `npm start` | Запуск собранного приложения |
| `npm run lint` | Проверка кода ESLint |
