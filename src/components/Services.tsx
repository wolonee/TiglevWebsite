import { Car, ShieldCheck, Globe } from "lucide-react";

const SERVICES = [
  {
    icon: Car,
    title: "Продажа авто",
    description:
      "Широкий выбор подержанных автомобилей по честным ценам. Каждый автомобиль проходит техническую проверку перед продажей.",
    cta: "Смотреть каталог",
    href: "#catalog",
  },
  {
    icon: ShieldCheck,
    title: "Выкуп автомобилей",
    description:
      "Срочный выкуп вашего автомобиля. Оценка за 30 минут, выплата всей суммы в день обращения. Любые марки и состояние.",
    cta: "Оценить авто",
    href: "#contacts",
  },
  {
    icon: Globe,
    title: "Авто из Европы",
    description:
      "Подбор и доставка автомобилей из Европы на заказ. Полное таможенное оформление, доставка от 10 дней.",
    cta: "Узнать подробнее",
    href: "#contacts",
  },
];

const Services = () => {
  return (
    <section id="services" className="bg-gray-bg py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Наши услуги
          </p>
          <h2 className="text-3xl font-extrabold text-dark sm:text-4xl">
            Чем мы можем помочь
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {SERVICES.map((service) => (
            <article
              key={service.title}
              className="group rounded-2xl border border-gray-border bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl lg:p-10"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <service.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-dark">
                {service.title}
              </h3>
              <p className="mb-6 leading-relaxed text-gray-text">
                {service.description}
              </p>
              <a
                href={service.href}
                className="inline-flex items-center text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
                tabIndex={0}
                aria-label={service.cta}
              >
                {service.cta}
                <span className="ml-2 transition-transform group-hover:translate-x-1">
                  &rarr;
                </span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
