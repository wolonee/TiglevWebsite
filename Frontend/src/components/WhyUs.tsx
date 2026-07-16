"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, Clock, ThumbsUp, Award, Car, CheckCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SectionHeading from "./SectionHeading";

type Stat = {
  target: number;
  suffix: string;
  label: string;
  icon: LucideIcon;
};

const STATS: Stat[] = [
  { target: 15, suffix: "+", label: "Лет на рынке", icon: Award },
  { target: 3000, suffix: "+", label: "Продано авто", icon: Car },
  { target: 98, suffix: "%", label: "Довольных клиентов", icon: ThumbsUp },
  { target: 30, suffix: "", label: "Минут на оценку", icon: Clock },
];

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

const useCountUp = (target: number, isVisible: boolean, duration = 2000): number => {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [isVisible, target, duration]);

  return count;
};

const AnimatedStat = ({ stat, isVisible }: { stat: Stat; isVisible: boolean }) => {
  const count = useCountUp(stat.target, isVisible);

  return (
    <div className="group text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-primary-light transition-all duration-300 group-hover:bg-primary-light group-hover:text-white">
        <stat.icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <p className="text-4xl font-extrabold tabular-nums text-white lg:text-5xl">
        {isVisible
          ? `${count.toLocaleString("ru-RU")}${stat.suffix}`
          : `0${stat.suffix}`}
      </p>
      <p className="mt-2 text-sm tracking-wide text-white/50">{stat.label}</p>
    </div>
  );
};

const WhyUs = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.2,
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [handleIntersection]);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative overflow-hidden bg-dark py-20 lg:py-28"
    >
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "40px 40px",
      }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-20 grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-12">
          {STATS.map((stat) => (
            <AnimatedStat key={stat.label} stat={stat} isVisible={isVisible} />
          ))}
        </div>

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
