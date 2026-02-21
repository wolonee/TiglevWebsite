import { Phone, MapPin, ArrowUpRight, ChevronUp } from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "Навигация",
    links: [
      { href: "#about", label: "О компании" },
      { href: "#catalog", label: "Каталог" },
      { href: "#services", label: "Услуги" },
      { href: "#contacts", label: "Контакты" },
    ],
  },
  {
    title: "Услуги",
    links: [
      { href: "#catalog", label: "Продажа авто" },
      { href: "#contacts", label: "Выкуп авто" },
      { href: "#contacts", label: "Авто из Европы" },
      { href: "#contacts", label: "Оценка авто" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="relative bg-dark pt-16 pb-8">
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/[0.06] pb-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              <img
                src="/logo.svg"
                alt="TIGLEV"
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <span className="text-lg font-extrabold text-white">
                TIGLEV
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-white/40">
              Автосалон в Тольятти. Продажа, выкуп и заказ автомобилей с 2009
              года. Честные цены и прозрачные сделки.
            </p>
            <a
              href="https://vk.com/tiglev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-medium text-white/50 transition-all hover:border-white/20 hover:text-white/70"
              aria-label="Мы ВКонтакте"
            >
              ВКонтакте
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>

          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white/60">
                {section.title}
              </h4>
              <nav
                className="flex flex-col gap-3"
                aria-label={`${section.title} — ссылки`}
              >
                {section.links.map((link) => (
                  <a
                    key={`${section.title}-${link.label}`}
                    href={link.href}
                    className="text-sm text-white/40 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          ))}

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white/60">
              Контакты
            </h4>
            <div className="space-y-3">
              <a
                href="tel:+78482750750"
                className="flex items-center gap-2.5 text-sm text-white/40 transition-colors hover:text-white"
                aria-label="Позвонить: +7 (8482) 750-750"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                +7 (8482) 750-750
              </a>
              <a
                href="tel:88005000015"
                className="flex items-center gap-2.5 text-sm text-white/40 transition-colors hover:text-white"
                aria-label="Бесплатная линия: 8-800-500-0015"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                8-800-500-0015
              </a>
              <p className="flex items-center gap-2.5 text-sm text-white/40">
                <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                Тольятти, Офицерская ул. 46
              </p>
            </div>

            <div className="mt-5 space-y-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
              <p className="text-xs font-medium text-white/50">Пн–Пт: 9:00 — 18:00</p>
              <p className="text-xs font-medium text-white/50">Сб: 9:00 — 17:00</p>
              <p className="text-xs font-medium text-white/50">Вс: 10:00 — 14:00</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} TIGLEV. Все права защищены.
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
