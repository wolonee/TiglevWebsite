"use client";

import Image from "next/image";
import Link from "next/link";
import { Phone, MapPin, ArrowUpRight, ChevronUp } from "lucide-react";
import { useSiteContent } from "./SiteContentProvider";

/**
 * Клиентский, а не серверный, и это важно: подвал попадает в `SitePage`, а тот
 * — в `loading.tsx` карточки машины. Заглушка Suspense не имеет права сама
 * приостанавливаться, поэтому асинхронный подвал ломал оживление всей страницы:
 * ни кнопки заявки, ни меню в шапке не работали. Данные берём из контекста —
 * он заполнен на сервере один раз в корневом макете.
 */
const Footer = () => {
  const { company, footer } = useSiteContent();
  const sections = footer.sections;

  return (
    <footer className="relative bg-dark pb-8 pt-10 sm:pt-16">
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-white/[0.06] pb-8 sm:grid-cols-2 sm:pb-12 lg:grid-cols-4 lg:gap-8">
          <div className="col-span-2">
            <div className="mb-5 flex items-center gap-2.5">
              <Image
                src="/logo-tiglev-clean.png"
                alt="TIGLEV.COM"
                width={36}
                height={36}
                quality={90}
                sizes="36px"
                className="h-9 w-9 rounded-md"
              />
              <span className="text-lg font-extrabold text-white">
                {company.name}
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-white/55">
              {company.about}
            </p>
            <a
              href={company.vkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-medium text-white/50 transition-all hover:border-white/20 hover:text-white/70"
              aria-label="Мы ВКонтакте"
            >
              ВКонтакте
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white/60">
                {section.title}
              </h4>
              <nav
                className="flex flex-col gap-3"
                aria-label={`${section.title} — ссылки`}
              >
                {section.links.map((link) => (
                  <Link
                    key={`${section.title}-${link.label}`}
                    href={link.href}
                    className="text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          <div className="col-span-2 lg:col-span-1">
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white/60">
              Контакты
            </h4>
            <div className="space-y-3">
              {company.phones.map((phone) => (
                <a
                  key={phone.href}
                  href={phone.href}
                  className="flex items-center gap-2.5 text-sm text-white/55 transition-colors hover:text-white"
                  aria-label={`Позвонить: ${phone.label}`}
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                  {phone.label}
                </a>
              ))}
              {company.address ? (
                <p className="flex items-center gap-2.5 text-sm text-white/55">
                  <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                  {company.address}
                </p>
              ) : null}
            </div>

            <div className="mt-5 space-y-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
              {company.workHours.map((workHours) => (
                <p key={workHours} className="text-xs font-medium text-white/50">
                  {workHours}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} {company.name}. Все права защищены.
          </p>

          <a
            href="#"
            className="group flex items-center gap-1.5 text-xs text-white/25 transition-colors hover:text-white/50"
            aria-label="Наверх"
          >
            Наверх
            <ChevronUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
