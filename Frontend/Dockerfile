# --- Этап 1: установка зависимостей ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Этап 2: сборка приложения ---
FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL

# Сборка заранее строит 136 посадочных страниц и ходит за данными в бэкенд,
# поэтому его адрес нужен уже здесь, а не только на исполнении.
ARG BACKEND_URL
ARG BACKEND_API_KEY
ENV BACKEND_URL=$BACKEND_URL
ENV BACKEND_API_KEY=$BACKEND_API_KEY

# Ники мессенджеров и адрес сайта попадают в клиентский бандл — только на сборке.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TELEGRAM_USERNAME
ARG NEXT_PUBLIC_VK_USERNAME
ARG NEXT_PUBLIC_MAX_USERNAME
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_TELEGRAM_USERNAME=$NEXT_PUBLIC_TELEGRAM_USERNAME
ENV NEXT_PUBLIC_VK_USERNAME=$NEXT_PUBLIC_VK_USERNAME
ENV NEXT_PUBLIC_MAX_USERNAME=$NEXT_PUBLIC_MAX_USERNAME
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Этап 3: минимальный образ для запуска ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Файлы standalone-сборки Next.js
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
