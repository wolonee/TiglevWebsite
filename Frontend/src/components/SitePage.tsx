import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function SitePage({ children }: { children: ReactNode }) {
  return <><Header solid/><main>{children}</main><Footer/></>;
}

export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="relative overflow-hidden bg-dark px-4 pb-20 pt-36 text-center text-white lg:pb-24 lg:pt-44">
    <div className="dot-pattern absolute inset-0 opacity-[.03]" />
    <div className="relative mx-auto max-w-3xl"><p className="eyebrow mb-4 text-primary-light">{eyebrow}</p><h1 className="text-4xl font-extrabold tracking-[-.02em] sm:text-5xl">{title}</h1><p className="mx-auto mt-5 max-w-2xl leading-relaxed text-white/55">{text}</p></div>
  </section>;
}
