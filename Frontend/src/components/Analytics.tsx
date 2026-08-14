"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

/**
 * Счётчик посещений.
 *
 * Пишем в свою базу, а не только во внешний сервис, потому что нужная цифра —
 * не «сколько визитов», а воронка: главная → каталог → карточка машины →
 * переход к продавцу. Именно последний шаг приносит деньги в арбитраже,
 * и по нему же видно, на каком экране люди отваливаются.
 *
 * Персональных данных не собираем. `visitor` — случайная строка, живущая
 * сутки в `sessionStorage`; она нужна только чтобы отличить «десять страниц
 * посмотрел один человек» от «по одной странице посмотрели десять».
 *
 * Ошибки глотаем намеренно: счётчик не имеет права ломать страницу.
 */

const VISITOR_KEY = "tg_visitor";

function visitorId(): string {
  try {
    const stored = sessionStorage.getItem(VISITOR_KEY);
    if (stored) return stored;
    const fresh = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return "anonymous";
  }
}

/** Тип события по адресу: чтобы воронка строилась без ручной разметки страниц. */
function eventType(pathname: string): string {
  if (pathname.startsWith("/catalog/")) {
    // Посадочные страницы — это каталог с предустановленным фильтром,
    // а не карточка товара. Отличаем по числу сегментов.
    const segments = pathname.split("/").filter(Boolean).length;
    return segments >= 3 ? "catalog" : "lot";
  }
  return "pageview";
}

export function track(event: {
  type: string;
  path?: string;
  lotId?: number;
  country?: string;
  /** Куда ушёл человек: telegram | vk | max. Только для `outbound`. */
  messenger?: string;
  /** Полный адрес карточки — попадёт в уведомление администратору. */
  pageUrl?: string;
}): void {
  try {
    const body = JSON.stringify({
      ...event,
      path: event.path ?? window.location.pathname,
      referrer: document.referrer || undefined,
      visitor: visitorId(),
    });
    // sendBeacon переживает уход со страницы — обычный fetch браузер отменит.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Счётчик молчит и не мешает.
  }
}

function Tracker() {
  const pathname = usePathname();
  const params = useSearchParams();
  const lastSent = useRef<string>("");

  useEffect(() => {
    const full = params.size ? `${pathname}?${params.toString()}` : pathname;
    // React в разработке монтирует дважды; без этого каждый визит удваивался бы.
    if (lastSent.current === full) return;
    lastSent.current = full;

    track({ type: eventType(pathname), path: full });
    // Каталог с фильтрами — отдельное событие поверх просмотра страницы:
    // так видно, доходят ли люди до фильтрации вообще.
    if (pathname === "/" && params.size) track({ type: "catalog", path: full });
  }, [pathname, params]);

  return null;
}

export default function Analytics() {
  // useSearchParams требует границы Suspense, иначе страница уходит
  // в динамический рендер целиком и теряет статику.
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
