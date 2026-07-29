import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function SitePage({ children }: { children: ReactNode }) {
  return <><Header solid/><main>{children}</main><Footer/></>;
}

export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="relative overflow-hidden bg-dark px-4 pb-14 pt-28 text-center text-white sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-44">
    <div className="dot-pattern absolute inset-0 opacity-[.03]" />
    <div className="relative mx-auto max-w-3xl"><p className="eyebrow mb-3 text-primary-light sm:mb-4">{eyebrow}</p><h1 className="text-3xl font-extrabold tracking-[-.02em] sm:text-5xl">{title}</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:mt-5 sm:text-base">{text}</p></div>
  </section>;
}
