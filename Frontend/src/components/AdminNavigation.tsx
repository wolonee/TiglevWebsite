"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useState, type MouseEvent } from "react";
import { CarFront, MessageSquare } from "lucide-react";

const items = [
  { href: "/admin/cars", label: "Автомобили", shortLabel: "", icon: CarFront },
  { href: "/admin/requests", label: "Заявки", shortLabel: "", icon: MessageSquare },
] as const;

function activeSection(pathname: string) {
  if (pathname.startsWith("/admin/requests")) return "/admin/requests";
  return "/admin/cars";
}

export default function AdminNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingNavigation, setPendingNavigation] = useState<{ from: string; target: string } | null>(null);
  const optimisticPath = pendingNavigation?.from === pathname ? pendingNavigation.target : pathname;
  const activePath = activeSection(optimisticPath);

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setPendingNavigation({ from: pathname, target: href });
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <nav aria-label="Разделы админки" className="flex items-center gap-1">
      {items.map(({ href, label, shortLabel, icon: Icon }) => {
        const active = activePath === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch
            aria-current={active ? "page" : undefined}
            onClick={(event) => navigate(event, href)}
            className={`inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-colors sm:px-3 ${active ? "bg-primary/10 text-primary" : "text-gray-text hover:bg-gray-bg hover:text-dark"}`}
          >
            <Icon className="h-4 w-4" />
            {shortLabel ? <><span className="hidden lg:inline">{label}</span><span className="lg:hidden">{shortLabel}</span></> : <span className="hidden sm:inline">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
