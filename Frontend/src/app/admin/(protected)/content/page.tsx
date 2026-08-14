import type { Metadata } from "next";
import SiteContentEditor from "@/components/SiteContentEditor";
import { mergeContent, type SiteContent } from "@/data/siteContent";

export const metadata: Metadata = { title: "Тексты сайта — админка TIGLEV.COM" };
export const dynamic = "force-dynamic";

/**
 * Правка текстов сайта.
 *
 * Заголовок первого экрана, пункты меню, телефоны и режим работы раньше жили
 * в исходниках: поменять номер означало правку кода и выкладку. Теперь это
 * делается отсюда, а код хранит только значения по умолчанию — их же сайт
 * покажет, если бэкенд молчит.
 */

async function loadContent(): Promise<SiteContent | null> {
  const base = process.env.BACKEND_URL;
  const key = process.env.BACKEND_API_KEY;
  if (!base || !key) return null;
  try {
    const response = await fetch(`${base}/api/admin/content`, {
      headers: { "x-api-key": key },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const { content } = (await response.json()) as { content: Partial<SiteContent> | null };
    // Достраиваем до полного документа: сохранённая запись старше кода, и
    // добавленного недавно поля в ней может не быть.
    return mergeContent(content);
  } catch (error) {
    console.error("Site content loading failed:", error);
    return null;
  }
}

export default async function ContentPage() {
  const content = await loadContent();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-dark">Тексты сайта</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-text">
          Всё, что здесь написано, посетитель увидит сразу после сохранения.
          Прошлые версии сохраняются, так что неудачную правку можно откатить.
        </p>
      </header>

      {content ? (
        <SiteContentEditor initial={content} />
      ) : (
        <section className="rounded-2xl border border-gray-border bg-white p-6">
          <h2 className="text-lg font-bold text-dark">Редактор недоступен</h2>
          <p className="mt-2 text-sm text-gray-text">
            Бэкенд не ответил. Проверьте переменные <code>BACKEND_URL</code> и{" "}
            <code>BACKEND_API_KEY</code>. Пока он молчит, сайт показывает тексты
            по умолчанию — те, что записаны в коде.
          </p>
        </section>
      )}
    </div>
  );
}
