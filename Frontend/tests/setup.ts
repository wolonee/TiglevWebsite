import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

afterEach(cleanup);

/**
 * В jsdom нет IntersectionObserver, а на нём держатся лента каталога, выгрузка
 * фотографий уехавших карточек и плавающая кнопка заявки. Заглушка ничего не
 * наблюдает: тесты, которым нужно управлять видимостью, подменяют её сами
 * через `vi.stubGlobal`.
 */
if (!("IntersectionObserver" in globalThis)) {
  class NoopIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: number[] = [];
  }
  vi.stubGlobal("IntersectionObserver", NoopIntersectionObserver);
}

Object.defineProperties(HTMLElement.prototype, {
  hasPointerCapture: { value: () => false },
  setPointerCapture: { value: () => undefined },
  releasePointerCapture: { value: () => undefined },
  scrollIntoView: { value: vi.fn(), writable: true, configurable: true },
});
