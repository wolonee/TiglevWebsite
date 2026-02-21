import { Car, ShieldCheck, Globe, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Service = {
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  href: string;
  accent: string;
};

const SERVICES: Service[] = [
  {
    icon: Car,
    title: "Продажа авто",
    description:
      "Широкий выбор подержанных автомобилей по честным ценам. Каждый автомобиль проходит полную техническую и юридическую проверку.",
    cta: "Смотреть каталог",
    href: "#catalog",
    accent: "from-primary/10 to-primary/5",
  },
  {
    icon: ShieldCheck,
    title: "Выкуп автомобилей",
    description:
      "Срочный выкуп вашего автомобиля за 30 минут. Оценка, оформление и выплата всей суммы в день обращения. Любые марки.",
    cta: "Оценить авто",
    href: "#contacts",
    accent: "from-amber-500/10 to-amber-500/5",
  },
  {
    icon: Globe,
    title: "Авто из Европы",
    description:
      "Подбор и доставка автомобилей из Европы на заказ. Полное таможенное оформление, страхование, доставка от 10 дней.",
    cta: "Узнать подробнее",
    href: "#contacts",
    accent: "from-blue-500/10 to-blue-500/5",
  },
];

const Services = () => {
  return (
    <section id="services" className="bg-gray-bg py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Наши услуги
          </p>
          <h2 className="text-3xl font-extrabold text-dark sm:text-4xl">
            Чем мы можем помочь
          </h2>
          <p className="mt-4 text-gray-text">
            Полный спектр услуг по продаже, покупке и доставке автомобилей
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {SERVICES.map((service, index) => (
            <article
              key={service.title}
              className="group relative overflow-hidden rounded-2xl border border-gray-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${service.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />
              <div className="relative p-8 lg:p-10">
                <div className="mb-2 text-xs font-bold tracking-wider text-gray-text/40">
                  0{index + 1}
                </div>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/20">
                  <service.icon className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <h3 className="mb-3 text-xl font-bold text-dark">
                  {service.title}
                </h3>
                <p className="mb-8 leading-relaxed text-gray-text">
                  {service.description}
                </p>
                <a
                  href={service.href}
                  className="group/link inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
                  tabIndex={0}
                  aria-label={`${service.cta} — ${service.title}`}
                >
                  {service.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
