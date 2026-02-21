import { Phone, MapPin } from "lucide-react";

const FOOTER_LINKS = [
  { href: "#about", label: "О компании" },
  { href: "#catalog", label: "Каталог" },
  { href: "#services", label: "Услуги" },
  { href: "#contacts", label: "Контакты" },
];

const Footer = () => {
  return (
    <footer className="bg-dark pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-base font-black text-white">T</span>
              </div>
              <span className="text-lg font-extrabold text-white">TIGLEV</span>
            </div>
            <p className="text-sm leading-relaxed text-white/50">
              Автосалон в Тольятти. Продажа, выкуп и заказ автомобилей с 2009 года.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">
              Навигация
            </h4>
            <nav className="flex flex-col gap-3" aria-label="Навигация в подвале">
              {FOOTER_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/50 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">
              Контакты
            </h4>
            <div className="space-y-3">
              <a
                href="tel:+78482750750"
                className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4" />
                +7 (8482) 750-750
              </a>
              <a
                href="tel:88005000015"
                className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4" />
                8-800-500-0015
              </a>
              <p className="flex items-center gap-2 text-sm text-white/50">
                <MapPin className="h-4 w-4 shrink-0" />
                Тольятти, Офицерская ул. 46
              </p>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">
              Режим работы
            </h4>
            <div className="space-y-2 text-sm text-white/50">
              <p>Будни: 9:00 — 18:00</p>
              <p>Суббота: 9:00 — 17:00</p>
              <p>Воскресенье: 10:00 — 14:00</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-xs text-white/30 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TIGLEV. Все права защищены.</p>
          <a
            href="https://vk.com/tiglev"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white/60"
          >
            ВКонтакте
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
