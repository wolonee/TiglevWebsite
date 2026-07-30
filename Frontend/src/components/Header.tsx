"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { CONTACT_DETAILS } from "@/data/contactDetails";

const links = [
  { href: "/", label: "Главная" },
  { href: "/#catalog", label: "Каталог" },
  { href: "/sell", label: "Продать авто" },
  { href: "/import", label: "Авто на заказ" },
];

export default function Header({ solid = false }: { solid?: boolean }) {
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
    <div className="shell flex h-16 items-center justify-between lg:h-20">
      <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="TIGLEV.COM, главная">
        <Image
          src="/logo-tiglev-clean.png"
          alt=""
          width={44}
          height={44}
          priority
          quality={90}
          sizes="44px"
          className="h-11 w-11 shrink-0 rounded-lg"
        />
        <Image
          src="/assets/tiglev-wordmark-white.svg"
          alt="TIGLEV"
          width={980}
          height={517}
          priority
          className={`h-7 w-auto shrink-0 transition-[filter] duration-300 lg:h-8 ${opaque ? "brightness-0" : ""}`}
        />
      </Link>
      <nav className="hidden items-center lg:flex" aria-label="Основная навигация">
        {links.map(link => { const active = link.href === "/" ? pathname === "/" : !link.href.includes("#") && pathname.startsWith(link.href); return <Link key={link.href} href={link.href} onClick={(event) => handleNavigation(event, link.href)} aria-current={active ? "page" : undefined} className={`relative px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${active ? opaque ? "text-primary" : "text-white" : opaque ? "text-dark-light" : "text-white/80"}`}>{link.label}{active && <span aria-hidden className="absolute inset-x-4 -bottom-0.5 h-0.5 bg-primary" />}</Link>; })}
      </nav>
      <div className="hidden items-center gap-3 lg:flex">
        <a href={CONTACT_DETAILS.phones[0].href} className={`flex items-center gap-2 text-sm font-semibold hover:text-primary ${opaque ? "text-dark" : "text-white"}`}><Phone size={16}/>{CONTACT_DETAILS.phones[0].label}</a>
        <Link href="/contacts" className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark"><MessageCircle size={16}/>Написать нам</Link>
      </div>
      <button className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg lg:hidden ${opaque ? "text-dark" : "text-white"}`} onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? "Закрыть меню" : "Открыть меню"}>{open ? <X/> : <Menu/>}</button>
    </div>
    </header>
    <div className={`fixed inset-0 top-16 z-40 bg-dark/30 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} />
    <nav className={`fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col overflow-y-auto border-t border-gray-border bg-white p-4 shadow-[0_18px_40px_rgb(15_23_42/0.18)] transition-transform duration-300 ease-out lg:hidden ${open ? "translate-x-0" : "translate-x-full"}`} aria-label="Мобильная навигация">
      <div className="space-y-1">
        {links.map(link => <Link key={link.href} href={link.href} onClick={(event) => handleNavigation(event, link.href)} className={`block rounded-xl px-4 py-3.5 font-medium transition-colors ${!link.href.includes("#") && pathname === link.href ? "bg-primary/10 text-primary" : "text-dark-light hover:bg-gray-bg"}`}>{link.label}</Link>)}
      </div>
      <div className="mt-6 border-t border-gray-border pt-5">
        <a href={CONTACT_DETAILS.phones[0].href} className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-dark hover:bg-gray-bg"><Phone className="text-primary" size={20}/>{CONTACT_DETAILS.phones[0].label}</a>
        <Link href="/contacts" onClick={() => setOpen(false)} className="mt-3 block rounded-xl bg-primary px-5 py-3.5 text-center font-semibold text-white transition-colors hover:bg-primary-dark">Написать нам</Link>
      </div>
    </nav>
  </>;
}
