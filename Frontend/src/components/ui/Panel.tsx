"use client";

import type { ReactNode } from "react";

/**
 * Белый блок с рамкой — основа всех экранов админки.
 *
 * До кита эта разметка (`rounded-2xl border border-gray-border bg-white p-5`)
 * была скопирована в каждый раздел, и блоки успели разойтись: где-то `p-5`,
 * где-то `p-6`, у аналитики скругление крупнее, чем у заявок. Разница мелкая,
 * но именно из таких мелочей интерфейс выглядит собранным на коленке.
 */

type PanelProps = {
  title?: ReactNode;
  /** Пояснение под заголовком: зачем этот блок и чем грозит его изменение. */
  note?: ReactNode;
  /** Кнопки или счётчик справа от заголовка. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

const Panel = ({ title, note, aside, children, className = "" }: PanelProps) => (
  <section className={`rounded-2xl border border-gray-border bg-white p-5 ${className}`}>
    {(title || aside) && (
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          {title ? <h2 className="text-lg font-bold text-dark">{title}</h2> : null}
          {note ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-text">{note}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    )}
    {children}
  </section>
);

export default Panel;
