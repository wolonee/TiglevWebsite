import { Car, ShieldCheck, Globe, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import SectionHeading from "./SectionHeading";

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
    title: "Каталог автомобилей",
    description:
      "Широкий выбор подержанных автомобилей по честным ценам. Каждый автомобиль проходит полную техническую и юридическую проверку.",
    cta: "Смотреть каталог",
    href: "/catalog",
    accent: "from-primary/10 to-primary/5",
  },
  {
    icon: ShieldCheck,
    title: "Выкуп вашего авто",
    description:
      "Срочный выкуп вашего автомобиля за 30 минут. Оценка, оформление и выплата всей суммы в день обращения. Любые марки.",
    cta: "Оценить авто",
    href: "/sell",
    accent: "from-amber-500/10 to-amber-500/5",
  },
  {
    icon: Globe,
    title: "Авто на заказ",
    description:
      "Подбор и доставка автомобилей из Европы на заказ. Полное таможенное оформление, страхование, доставка от 10 дней.",
    cta: "Узнать подробнее",
    href: "/import",
    accent: "from-blue-500/10 to-blue-500/5",
  },
];

const Services = () => {
  return (
    <section id="services" className="bg-gray-bg py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Наши услуги" title="Чем мы можем помочь" description="Полный спектр услуг по продаже, покупке и доставке автомобилей" className="mb-16" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {SERVICES.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              aria-label={`${service.cta} — ${service.title}`}
              className="group relative flex overflow-hidden rounded-2xl border border-gray-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${service.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />
              <div className="relative flex flex-1 flex-col p-8 lg:p-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/20">
                  <service.icon className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <h3 className="mb-3 text-xl font-bold text-dark">
                  {service.title}
                </h3>
                <p className="mb-8 leading-relaxed text-gray-text">
                  {service.description}
                </p>
                <span className="group/link mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {service.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
