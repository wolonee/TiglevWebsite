import Image from "next/image";

const Hero = () => {
  return (
    <section className="relative flex min-h-[88svh] items-center overflow-hidden bg-dark sm:min-h-[100svh]">
      <Image
        src="/images/hero-car.webp"
        alt="Фон — автомобиль"
        fill
        priority
        quality={82}
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-dark/80 via-dark/60 to-dark/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark/50 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-20 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
        <div className="max-w-2xl animate-fade-in">
          <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-sm sm:mb-5 sm:px-4">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="truncate text-xs font-medium tracking-wide text-white/70">
              Автосалон в Тольятти — с 2009 года
            </span>
          </div>

          <h1 className="mb-4 text-3xl leading-[1.08] font-extrabold tracking-tight text-white sm:mb-6 sm:text-5xl lg:text-6xl">
            Автомобили{" "}
            <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">
              с пробегом
            </span>
          </h1>

          <p className="mb-8 max-w-lg text-sm leading-relaxed text-white/60 sm:mb-12 sm:text-lg">
            Продажа, выкуп и заказ автомобилей из Европы. Честные цены,
            юридическая чистота и прозрачные сделки.
          </p>
        </div>

        <div
          className="grid grid-cols-3 gap-3 animate-fade-in sm:flex sm:flex-wrap sm:justify-start sm:gap-12"
          style={{ animationDelay: "200ms" }}
        >
          {[
            { value: "3 000+", label: "автомобилей продано" },
            { value: "15+", label: "лет на рынке" },
            { value: "98%", label: "довольных клиентов" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-lg font-extrabold text-white sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-[10px] leading-4 tracking-wide text-white/40 sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce sm:bottom-6">
        <a
          href="#catalog"
          className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/20 pt-1.5"
          aria-label="Прокрутить вниз"
        >
          <span className="h-2 w-1 rounded-full bg-white/50" />
        </a>
      </div>
    </section>
  );
};

export default Hero;
