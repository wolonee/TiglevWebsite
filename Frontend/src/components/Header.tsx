"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { startTransition, useEffect, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";

const links = [
  { href: "/", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/sell", label: "Продать авто" },
  { href: "/import", label: "Авто на заказ" },
];

export default function Header({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ from: string; target: string } | null>(null);
  const opaque = solid || scrolled || open;
  const optimisticPath = pendingNavigation?.from === pathname ? pendingNavigation.target : pathname;

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const selectTab = () => setPendingNavigation({ from: pathname, target: href });
    const documentWithTransitions = document as Document & { startViewTransition?: (callback: () => void) => void };
    if (documentWithTransitions.startViewTransition) documentWithTransitions.startViewTransition(() => flushSync(selectTab));
    else selectTab();
    startTransition(() => router.push(href));
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  return <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${opaque ? "border-b border-gray-border/70 bg-white/95 shadow-sm backdrop-blur-xl" : "bg-transparent"}`}>
    <div className="shell flex h-16 items-center justify-between lg:h-20">
      <Link href="/" className="flex items-center gap-2.5" aria-label="TIGLEV.COM — главная">
        <Image src="/logo.svg" alt="" width={40} height={40} />
        <span className={`text-xl font-extrabold tracking-tight ${opaque ? "text-dark" : "text-white"}`}>TIGLEV.COM</span>
      </Link>
      <nav className="hidden items-center lg:flex" aria-label="Основная навигация">
        {links.map(link => { const active = link.href === "/" ? optimisticPath === "/" : optimisticPath.startsWith(link.href); return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} onClick={(event) => navigate(event, link.href)} className={`relative px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${active ? opaque ? "text-primary" : "text-white" : opaque ? "text-dark-light" : "text-white/80"}`}>{link.label}{active && <span aria-hidden className="absolute inset-x-4 -bottom-0.5 h-0.5 bg-primary" style={{ viewTransitionName: "public-nav-indicator" }} />}</Link>; })}
      </nav>
      <div className="hidden items-center gap-3 lg:flex">
        <a href="tel:+78482750750" className={`flex items-center gap-2 text-sm font-semibold hover:text-primary ${opaque ? "text-dark" : "text-white"}`}><Phone size={16}/>+7 (8482) 750-750</a>
        <Link href="/contacts" className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark"><MessageCircle size={16}/>Написать нам</Link>
      </div>
      <button className={`rounded-lg p-2 lg:hidden ${opaque ? "text-dark" : "text-white"}`} onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? "Закрыть меню" : "Открыть меню"}>{open ? <X/> : <Menu/>}</button>
    </div>
    <div className={`fixed inset-0 top-16 bg-black/40 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} />
    <nav className={`fixed bottom-0 right-0 top-16 w-72 bg-white p-5 shadow-2xl transition-transform lg:hidden ${open ? "translate-x-0" : "translate-x-full"}`} aria-label="Мобильная навигация">
      {links.map(link => <Link key={link.href} href={link.href} onClick={(event) => { setOpen(false); navigate(event, link.href); }} className={`block rounded-xl px-4 py-3.5 font-medium transition-colors ${optimisticPath === link.href ? "bg-primary/5 text-primary" : "text-dark-light"}`}>{link.label}</Link>)}
      <a href="tel:+78482750750" className="mt-5 flex items-center gap-3 border-t border-gray-border px-4 pt-6 font-semibold text-dark"><Phone className="text-primary" size={20}/>+7 (8482) 750-750</a>
      <Link href="/contacts" onClick={() => setOpen(false)} className="mt-5 block rounded-xl bg-primary px-5 py-3.5 text-center font-semibold text-white">Написать нам</Link>
    </nav>
  </header>;
}
