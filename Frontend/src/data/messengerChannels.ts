import "server-only";

import { defaultChannels, type MessengerChannel } from "./messengers";

/**
 * Каналы связи из бэкенда: их правит администратор в `/admin/messengers`.
 *
 * Читаем на сервере и передаём в компонент готовым списком. Раньше ники жили
 * в `NEXT_PUBLIC_…` и попадали в клиентский бандл на сборке — чтобы отключить
 * мессенджер, приходилось менять переменную и пересобирать сайт.
 *
 * Кешируем на пять минут с тегом: админка сбрасывает его после сохранения,
 * иначе выключенная кнопка жила бы на страницах до истечения срока.
 */
export const MESSENGERS_TAG = "messengers";

export async function fetchMessengerChannels(): Promise<MessengerChannel[]> {
  const base = process.env.BACKEND_URL;
  if (!base) return defaultChannels();

  try {
    const response = await fetch(`${base}/api/messengers`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: [MESSENGERS_TAG] },
    });
    if (!response.ok) throw new Error(`Бэкенд ответил ${response.status}`);
    const { channels } = (await response.json()) as { channels: MessengerChannel[] };
    // Пустой список — это осознанный выбор администратора «связи здесь нет»,
    // а вот сорвавшийся запрос падает в catch и показывает запасные каналы.
    return channels;
  } catch (error) {
    // Громко: без каналов покупателю некуда нажать, и это стоит денег.
    console.error("Не удалось получить каналы связи, показываю запасные:", error);
    return defaultChannels();
  }
}
