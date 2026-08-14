import type { Metadata } from "next";
import MessengerSettings from "@/components/MessengerSettings";
import type { MessengerChannel } from "@/data/messengers";

export const metadata: Metadata = { title: "Каналы связи — админка TIGLEV.COM" };
export const dynamic = "force-dynamic";

/**
 * Настройка каналов связи.
 *
 * Раньше ники мессенджеров были переменными окружения на Vercel: чтобы убрать
 * сервис, с которым перестали работать, приходилось править переменную и ждать
 * пересборки сайта. Теперь список живёт в базе и меняется отсюда.
 */

async function loadChannels(): Promise<MessengerChannel[] | null> {
  const base = process.env.BACKEND_URL;
  const key = process.env.BACKEND_API_KEY;
  if (!base || !key) return null;
  try {
    const response = await fetch(`${base}/api/admin/messengers`, {
      headers: { "x-api-key": key },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const { channels } = (await response.json()) as { channels: MessengerChannel[] };
    return channels;
  } catch (error) {
    console.error("Messenger channels loading failed:", error);
    return null;
  }
}

export default async function MessengersPage() {
  const channels = await loadChannels();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-dark">Каналы связи</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-text">
          Кнопки под ценой на карточке машины. Переход по любой из них приходит
          уведомлением в Telegram-бот — где бы покупатель ни написал, заявка не
          потеряется.
        </p>
      </header>

      {channels ? (
        <MessengerSettings initial={channels} />
      ) : (
        <section className="rounded-2xl border border-gray-border bg-white p-6">
          <h2 className="text-lg font-bold text-dark">Настройки недоступны</h2>
          <p className="mt-2 text-sm text-gray-text">
            Бэкенд не ответил. Проверьте переменные <code>BACKEND_URL</code> и{" "}
            <code>BACKEND_API_KEY</code>. Пока он молчит, на сайте показываются
            каналы по умолчанию — Telegram и VK.
          </p>
        </section>
      )}
    </div>
  );
}
