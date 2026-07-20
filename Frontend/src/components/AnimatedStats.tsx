"use client";

import { useEffect, useRef, useState } from "react";
import { Award, Car, Clock, ThumbsUp } from "lucide-react";

const stats = [
  { target: 15, suffix: "+", label: "Лет на рынке", Icon: Award },
  { target: 3000, suffix: "+", label: "Продано авто", Icon: Car },
  { target: 98, suffix: "%", label: "Довольных клиентов", Icon: ThumbsUp },
  { target: 30, suffix: "", label: "Минут на оценку", Icon: Clock },
] as const;

function AnimatedValue({ target, active }: { target: number; active: boolean }) {
  const [value, setValue] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    if (!active || animated.current) return;
    animated.current = true;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min((now - start) / 1600, 1);
      setValue(Math.floor((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  return value.toLocaleString("ru-RU");
}

export default function AnimatedStats() {
  const container = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setActive(true);
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="mb-20 grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-12">
      {stats.map(({ target, suffix, label, Icon }) => (
        <div key={label} className="group text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-primary-light transition-colors group-hover:bg-primary-light group-hover:text-white"><Icon className="h-6 w-6" strokeWidth={1.5} /></div>
          <p className="text-4xl font-extrabold tabular-nums text-white lg:text-5xl"><AnimatedValue target={target} active={active} />{suffix}</p>
          <p className="mt-2 text-sm tracking-wide text-white/50">{label}</p>
        </div>
      ))}
    </div>
  );
}
