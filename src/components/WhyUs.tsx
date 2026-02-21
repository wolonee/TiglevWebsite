import { Shield, Clock, ThumbsUp, Award, Car } from "lucide-react";

const STATS = [
  { value: "15+", label: "Лет на рынке", icon: Award },
  { value: "3000+", label: "Продано авто", icon: Car },
  { value: "98%", label: "Довольных клиентов", icon: ThumbsUp },
  { value: "30", label: "Минут на оценку", icon: Clock },
];

const ADVANTAGES = [
  {
    icon: Shield,
    title: "Юридическая чистота",
    description: "Проверяем каждый автомобиль по всем базам данных",
  },
  {
    icon: Clock,
    title: "Быстрое оформление",
    description: "Полное сопровождение сделки за 1 день",
  },
  {
    icon: ThumbsUp,
    title: "Гарантия качества",
    description: "Техническая диагностика перед продажей",
  },
  {
    icon: Award,
    title: "Честные цены",
    description: "Рыночная оценка без скрытых наценок",
  },
];

const WhyUs = () => {
  return (
    <section id="about" className="overflow-hidden bg-dark py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-20 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="mx-auto mb-3 h-8 w-8 text-primary-light" />
              <p className="text-4xl font-extrabold text-white lg:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Advantages */}
        <div className="text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary-light">
            Почему мы
          </p>
          <h2 className="mb-14 text-3xl font-extrabold text-white sm:text-4xl">
            Наши преимущества
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ADVANTAGES.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-white/10"
            >
              <item.icon className="mb-4 h-8 w-8 text-primary-light" />
              <h3 className="mb-2 text-lg font-bold text-white">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
