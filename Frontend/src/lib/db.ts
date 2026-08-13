import { neon } from "@neondatabase/serverless";

/**
 * Подключение к Neon.
 *
 * Драйвер работает поверх HTTP, а не через TCP-пул: у бессерверных функций
 * соединения не переиспользуются, и обычный пул на холодных стартах быстро
 * упирается в лимит соединений.
 *
 * Функции должны быть развёрнуты в том же регионе, что и база (Франкфурт,
 * `fra1` в `vercel.json`). Иначе к каждому запросу добавляется около 70 мс
 * дороги — это в двадцать раз больше самого запроса.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL не задан. Каталог берётся из Postgres — без него страница не соберётся.",
  );
}

export const sql = neon(connectionString);
