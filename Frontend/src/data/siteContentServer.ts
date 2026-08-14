import "server-only";

import { cache } from "react";
import { DEFAULT_CONTENT, mergeContent, type SiteContent } from "./siteContent";

/**
 * Тексты сайта из бэкенда.
 *
 * Через `cache`, потому что за содержимым приходят несколько компонентов на
 * одной странице (шапка, первый экран, подвал), и без него это были бы три
 * одинаковых запроса на каждый показ.
 *
 * Кеш с тегом на пять минут: админка сбрасывает его после сохранения, иначе
 * исправленный телефон появлялся бы на сайте с задержкой, и администратор
 * решил бы, что кнопка не сработала.
 */
export const CONTENT_TAG = "site-content";

export const fetchSiteContent = cache(async (): Promise<SiteContent> => {
  const base = process.env.BACKEND_URL;
  if (!base) return DEFAULT_CONTENT;

  try {
    const response = await fetch(`${base}/api/content`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: [CONTENT_TAG] },
    });
    if (!response.ok) throw new Error(`Бэкенд ответил ${response.status}`);
    const { content } = (await response.json()) as { content: Partial<SiteContent> | null };
    return mergeContent(content);
  } catch (error) {
    // Громко: сайт покажет тексты из кода, и расхождение с админкой собьёт с толку.
    console.error("Не удалось получить тексты сайта, показываю значения по умолчанию:", error);
    return DEFAULT_CONTENT;
  }
});
