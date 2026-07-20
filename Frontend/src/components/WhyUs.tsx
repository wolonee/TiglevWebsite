import { Shield, Clock, Award, CheckCircle } from "lucide-react";
import AnimatedStats from "./AnimatedStats";
import SectionHeading from "./SectionHeading";

const ADVANTAGES = [
  {
    icon: Shield,
    title: "Юридическая чистота",
    description: "Проверяем каждый автомобиль по базам ГИБДД, ФНП, ФССП и залоговых реестров",
  },
  {
    icon: Clock,
    title: "Быстрое оформление",
    description: "Полное сопровождение сделки: от осмотра до регистрации за 1 день",
  },
  {
    icon: CheckCircle,
    title: "Гарантия качества",
    description: "Независимая техническая диагностика каждого автомобиля перед продажей",
  },
  {
    icon: Award,
    title: "Честные цены",
    description: "Рыночная оценка без скрытых наценок и навязанных дополнительных услуг",
  },
];

const WhyUs = () => {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-dark py-20 lg:py-28"
    >
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "40px 40px",
      }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedStats />

        <SectionHeading eyebrow="Почему мы" title="Наши преимущества" description="Работаем на доверии и репутации — каждый клиент для нас важен" tone="dark" className="mb-14" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {ADVANTAGES.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-7 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-white/[0.07]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20">
                <item.icon
                  className="h-6 w-6 text-primary-light"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/50">
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
