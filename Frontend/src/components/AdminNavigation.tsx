"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
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
    const selectTab = () => setPendingNavigation({ from: pathname, target: href });
    const documentWithTransitions = document as Document & { startViewTransition?: (callback: () => void) => void };
    if (documentWithTransitions.startViewTransition) {
      documentWithTransitions.startViewTransition(() => flushSync(selectTab));
    } else {
      selectTab();
    }
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
            className={`relative isolate inline-flex items-center gap-2 overflow-hidden rounded-lg px-2 py-2 text-sm font-semibold transition-colors sm:px-3 ${active ? "text-primary" : "text-gray-text hover:bg-gray-bg hover:text-dark"}`}
          >
            {active && <span aria-hidden className="absolute inset-0 -z-10 rounded-lg bg-primary/10" style={{ viewTransitionName: "admin-nav-indicator" }} />}
            <Icon className="relative h-4 w-4" />
            {shortLabel ? <><span className="relative hidden lg:inline">{label}</span><span className="relative lg:hidden">{shortLabel}</span></> : <span className="relative hidden sm:inline">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
