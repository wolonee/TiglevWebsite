"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_CONTENT, type SiteContent } from "@/data/siteContent";

/**
 * Тексты и контакты для клиентских компонентов.
 *
 * Шапка, блок сделки и список контактов работают в браузере и до сервера сами
 * не дотянутся. Прокидывать телефон через десяток компонентов пришлось бы
 * руками на каждой странице, поэтому документ кладётся в контекст один раз
 * в корневом макете.
 *
 * Значение по умолчанию — не пустышка: если провайдера почему-то нет (тест,
 * витрина кита), компоненты покажут тексты из кода, а не упадут.
 */
const SiteContentContext = createContext<SiteContent>(DEFAULT_CONTENT);

export function SiteContentProvider({ value, children }: { value: SiteContent; children: ReactNode }) {
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}
