"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { useSiteContent } from "./SiteContentProvider";
import TiglevWordmark from "./TiglevWordmark";

export default function Header({ solid = false }: { solid?: boolean }) {
  // Пункты меню, подпись кнопки и телефон приходят из админки.
  const { header, company } = useSiteContent();
  const links = header.nav;
  const phone = company.phones[0];
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const opaque = solid || scrolled || open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  function handleNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    setOpen(false);
    if (href !== "/#catalog" || pathname !== "/") return;
    const catalog = document.getElementById("catalog");
    if (!catalog) return;
    event.preventDefault();
    catalog.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(window.history.state, "", "/#catalog");
  }

  return <>
    <header className={`fixed inset-x-0 top-0 z-[60] transition-all duration-500 ${opaque ? "border-b border-gray-border/70 bg-white/95 shadow-sm backdrop-blur-xl" : "bg-transparent"}`}>
    <div className="shell flex h-[72px] items-center justify-between lg:h-20">
      <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="TIGLEV.COM, главная">
        {/*
          Логотип — резкая графика с красно-белыми краями. next/image ужимал
          его в webp q90 и на DPR=1 отдавал вовсе 48px, отчего на ретине была
          каша по краям. `unoptimized` отдаёт готовый файл как есть; сам файл
          заранее уменьшен из мастера 1254px до чёткого 192px без потерь.
          Размер 60px подобран так, что буквы внутри восьмиугольника (≈39% его
          высоты) выходят cap-height ~23px — вровень с надписью «TIGLEV.COM».
        */}
        <Image
          src="/logo-tiglev-192.png"
          alt=""
          width={60}
          height={60}
          priority
          unoptimized
          className="h-[60px] w-[60px] shrink-0 rounded-lg"
        />
        {/*
          Надпись «TIGLEV.COM» — кастомный wordmark: «TIGLEV» родными контурами
          логотипа, «.COM» — обведённые буквы, нарисованные под этот шрифт.
          Инлайн-SVG (см. TiglevWordmark), а не картинка/маска: чёткий на любом
          размере и плотности, «O» с просветом, цвет наследуется от text-*.
          Высота чуть больше букв в знаке; по вертикали надпись выровнена по
          центру букв логотипа (заглавные SVG сами центрированы в боксе).
        */}
        <TiglevWordmark
          className={`h-[26px] w-auto shrink-0 transition-colors duration-300 ${opaque ? "text-dark" : "text-white"}`}
        />
      </Link>
      <nav className="hidden items-center lg:flex" aria-label="Основная навигация">
        {links.map(link => { const active = link.href === "/" ? pathname === "/" : !link.href.includes("#") && pathname.startsWith(link.href); return <Link key={link.href} href={link.href} onClick={(event) => handleNavigation(event, link.href)} aria-current={active ? "page" : undefined} className={`relative px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${active ? opaque ? "text-primary" : "text-white" : opaque ? "text-dark-light" : "text-white/80"}`}>{link.label}{active && <span aria-hidden className="absolute inset-x-4 -bottom-0.5 h-0.5 bg-primary" />}</Link>; })}
      </nav>
      <div className="hidden items-center gap-3 lg:flex">
        {phone ? <a href={phone.href} className={`flex items-center gap-2 text-sm font-semibold hover:text-primary ${opaque ? "text-dark" : "text-white"}`}><Phone size={16}/>{phone.label}</a> : null}
        <Link href={header.ctaHref} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark"><MessageCircle size={16}/>{header.ctaLabel}</Link>
      </div>
      <button className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg lg:hidden ${opaque ? "text-dark" : "text-white"}`} onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? "Закрыть меню" : "Открыть меню"}>{open ? <X/> : <Menu/>}</button>
    </div>
    </header>
    <div className={`fixed inset-0 top-[72px] z-40 bg-dark/30 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} />
    <nav className={`fixed inset-x-0 bottom-0 top-[72px] z-50 flex flex-col overflow-y-auto border-t border-gray-border bg-white p-4 shadow-[0_18px_40px_rgb(15_23_42/0.18)] transition-transform duration-300 ease-out lg:hidden ${open ? "translate-x-0" : "translate-x-full"}`} aria-label="Мобильная навигация">
      <div className="space-y-1">
        {links.map(link => <Link key={link.href} href={link.href} onClick={(event) => handleNavigation(event, link.href)} className={`block rounded-xl px-4 py-3.5 font-medium transition-colors ${!link.href.includes("#") && pathname === link.href ? "bg-primary/10 text-primary" : "text-dark-light hover:bg-gray-bg"}`}>{link.label}</Link>)}
      </div>
      <div className="mt-6 border-t border-gray-border pt-5">
        {phone ? <a href={phone.href} className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-dark hover:bg-gray-bg"><Phone className="text-primary" size={20}/>{phone.label}</a> : null}
        <Link href={header.ctaHref} onClick={() => setOpen(false)} className="mt-3 block rounded-xl bg-primary px-5 py-3.5 text-center font-semibold text-white transition-colors hover:bg-primary-dark">{header.ctaLabel}</Link>
      </div>
    </nav>
  </>;
}
