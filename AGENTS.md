# Repository Guidelines

## Project Structure & Module Organization

This repository contains two TypeScript applications:

- `Frontend/`: Next.js App Router application. Routes live in `src/app`, reusable UI in `src/components`, catalog data in `src/data`, and static assets in `public/`.
- `Backend/`: Express API and Telegram bot. HTTP setup is in `src/app.ts`, delivery integrations are in `src/telegram.ts` and `src/email.ts`, database access is in `src/database.ts`, and Vercel handlers live in `api/`.
- `docker-compose.yml`: runs the frontend, backend, and PostgreSQL together.

Keep feature code in the relevant application. Do not duplicate shared frontend widgets; extract or reuse components instead.

## Build, Test, and Development Commands

Run commands from the appropriate application directory:

```bash
cd Frontend && npm run dev       # Next.js development server
cd Frontend && npm run lint      # ESLint checks
cd Frontend && npm run build     # production build and TypeScript validation
cd Backend && npm run dev        # watched Express server
cd Backend && npm run typecheck  # TypeScript without emitting files
cd Backend && npm run build      # compile into dist/
docker compose up --build        # run the complete local stack
```

No automated test suite is configured yet. For every change, run the relevant lint, typecheck, and production build commands. Add tests alongside new behavior when introducing a test framework; use descriptive names such as `contact-request.test.ts`.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, semicolons, and double quotes. Name React components in PascalCase, functions and variables in camelCase, and route folders in kebab-case. Prefer small reusable components and validate external input with Zod. Never expose server secrets to client components.

## Commit & Pull Request Guidelines

Create a new short branch for each change, for example `feat/contact-form` or `fix/photo-upload`. Use atomic Conventional Commits:

```text
feat(contact): send requests by email
fix(telegram): handle a single photo
```

Write the description in lowercase imperative form without a trailing period. Do not add AI co-author or generation notices. PRs must explain what changed, why, and which checks passed. Include screenshots for visible UI changes.

## Security & Configuration

Copy values from `.env.example` into local `.env` files. Never commit tokens, API keys, database URLs, or Vercel environment files. Rotate any secret that was exposed in logs, chat, or Git history.
