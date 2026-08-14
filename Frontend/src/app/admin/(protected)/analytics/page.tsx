import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Аналитика — админка TIGLEV.COM" };
export const dynamic = "force-dynamic";

/**
 * Сводка посещений.
 *
 * Главное здесь не «сколько визитов», а воронка: сколько людей дошли
 * от главной до каталога, оттуда до карточки машины и до перехода к продавцу.
 * Проседающий шаг и есть узкое место — по нему видно, что чинить.
 */

type Summary = {
  totals: { type: string; hits: number; visitors: number }[];
  byDay: { day: string; type: string; hits: number; visitors: number }[];
  topPages: { path: string; hits: number; visitors: number }[];
  topReferrers: { referrer: string; hits: number }[];
  devices: { device: string; hits: number }[];
  topLots: { lot_id: number; brand: string | null; model: string | null; hits: number }[];
};

const STEPS: { type: string; label: string; hint: string }[] = [
  { type: "pageview", label: "Зашли на сайт", hint: "открыли любую страницу" },
  { type: "catalog", label: "Дошли до каталога", hint: "открыли список машин или фильтр" },
  { type: "lot", label: "Открыли машину", hint: "зашли в карточку" },
  // Раньше здесь стояло «Перешли к продавцу» — формулировка из старой затеи,
  // когда этот шаг означал уход на CarClick. Сейчас это кнопки Telegram, VK
  // и MAX на карточке: человек пишет НАМ, и уведомление приходит в бот.
  { type: "outbound", label: "Написали в мессенджер", hint: "нажали Telegram, VK или MAX" },
  { type: "lead", label: "Оставили заявку", hint: "заполнили форму с телефоном" },
];

async function loadSummary(days: number): Promise<Summary | null> {
  const base = process.env.BACKEND_URL;
  const key = process.env.BACKEND_API_KEY;
  if (!base || !key) return null;
  try {
    const response = await fetch(`${base}/api/analytics/summary?days=${days}`, {
      headers: { "x-api-key": key },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as Summary;
  } catch {
    return null;
  }
}

const nf = new Intl.NumberFormat("ru-RU");

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: rawDays } = await searchParams;
  const days = Number(rawDays) > 0 ? Math.min(Number(rawDays), 90) : 30;
  const summary = await loadSummary(days);

  if (!summary) {
    return (
      <section className="rounded-2xl border border-gray-border bg-white p-6">
        <h1 className="text-xl font-bold text-dark">Аналитика недоступна</h1>
        <p className="mt-2 text-sm text-gray-text">
          Бэкенд не ответил. Проверьте переменные <code>BACKEND_URL</code> и{" "}
          <code>BACKEND_API_KEY</code>.
        </p>
      </section>
    );
  }

  const byType = new Map(summary.totals.map((t) => [t.type, t]));
  const entered = byType.get("pageview")?.visitors ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-dark">Аналитика</h1>
        <nav className="flex gap-1 text-sm">
          {[7, 30, 90].map((value) => (
            <Link
              key={value}
              href={`/admin/analytics?days=${value}`}
              className={`rounded-lg px-3 py-1.5 ${
                days === value ? "bg-dark text-white" : "bg-gray-bg text-gray-text hover:text-dark"
              }`}
            >
              {value} дней
            </Link>
          ))}
        </nav>
      </header>

      <section className="rounded-2xl border border-gray-border bg-white p-5">
        <h2 className="mb-1 text-lg font-bold text-dark">Воронка</h2>
        <p className="mb-4 text-sm text-gray-text">
          Где обрывается путь — там и узкое место.
        </p>
        <div className="space-y-2">
          {STEPS.map((step) => {
            const row = byType.get(step.type);
            const visitors = row?.visitors ?? 0;
            const share = entered ? Math.round((visitors / entered) * 100) : 0;
            return (
              <div key={step.type} className="flex items-center gap-3">
                <div className="w-44 shrink-0">
                  <p className="text-sm font-medium text-dark">{step.label}</p>
                  <p className="text-xs text-gray-text">{step.hint}</p>
                </div>
                <div className="h-7 flex-1 overflow-hidden rounded-md bg-gray-bg">
                  <div
                    className="h-full bg-primary/80"
                    style={{ width: `${Math.max(share, visitors ? 2 : 0)}%` }}
                  />
                </div>
                <div className="w-28 shrink-0 text-right">
                  <span className="text-sm font-bold text-dark">{nf.format(visitors)}</span>
                  <span className="ml-1 text-xs text-gray-text">{share}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 rounded-lg bg-gray-bg px-3 py-2 text-sm text-gray-text">
          Последние два шага — это два способа связаться, а не один за другим:
          кто-то пишет в мессенджер, кто-то оставляет телефон в форме. Складывать
          их не нужно, сравнивать между собой — можно.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-border bg-white p-5">
          <h2 className="mb-3 text-lg font-bold text-dark">Откуда приходят</h2>
          {summary.topReferrers.length ? (
            <ul className="space-y-1.5 text-sm">
              {summary.topReferrers.map((row) => (
                <li key={row.referrer} className="flex justify-between gap-3">
                  <span className="truncate text-gray-text">{row.referrer}</span>
                  <span className="shrink-0 font-medium text-dark">{nf.format(row.hits)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-text">Пока нет данных.</p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-border bg-white p-5">
          <h2 className="mb-3 text-lg font-bold text-dark">Устройства</h2>
          {summary.devices.length ? (
            <ul className="space-y-1.5 text-sm">
              {summary.devices.map((row) => (
                <li key={row.device} className="flex justify-between gap-3">
                  <span className="text-gray-text">{row.device}</span>
                  <span className="font-medium text-dark">{nf.format(row.hits)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-text">Пока нет данных.</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-border bg-white p-5">
        <h2 className="mb-3 text-lg font-bold text-dark">Популярные страницы</h2>
        {summary.topPages.length ? (
          <ul className="space-y-1.5 text-sm">
            {summary.topPages.map((row) => (
              <li key={row.path} className="flex justify-between gap-3">
                <span className="truncate text-gray-text">{row.path}</span>
                <span className="shrink-0 font-medium text-dark">
                  {nf.format(row.hits)}
                  <span className="ml-1 text-xs font-normal text-gray-text">
                    {nf.format(row.visitors)} чел.
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-text">Пока нет данных.</p>
        )}
      </section>

      {summary.topLots.length > 0 && (
        <section className="rounded-2xl border border-gray-border bg-white p-5">
          <h2 className="mb-1 text-lg font-bold text-dark">О каких машинах пишут</h2>
          <p className="mb-3 text-sm text-gray-text">
            С этих карточек нажимали кнопку мессенджера. По каждому такому нажатию
            в бот приходит уведомление с машиной и ссылкой.
          </p>
          <ul className="space-y-1.5 text-sm">
            {summary.topLots.map((row) => (
              <li key={row.lot_id} className="flex justify-between gap-3">
                <span className="truncate text-gray-text">
                  {row.brand ?? "—"} {row.model ?? ""}
                </span>
                <span className="shrink-0 font-medium text-dark">{nf.format(row.hits)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
