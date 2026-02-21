"use client";

import { useState } from "react";
import { MapPin, Phone, Clock, Send, CheckCircle2 } from "lucide-react";

type FormState = "idle" | "submitting" | "success";

const CONTACT_INFO = [
  {
    icon: MapPin,
    title: "Адрес",
    lines: ["Тольятти, Офицерская ул. 46, ГСК 66"],
  },
  {
    icon: Phone,
    title: "Телефон",
    lines: ["+7 (8482) 750-750", "8-800-500-0015"],
    hrefs: ["tel:+78482750750", "tel:88005000015"],
  },
  {
    icon: Clock,
    title: "Режим работы",
    lines: ["Пн–Пт: 9:00 — 18:00", "Сб: 9:00 — 17:00", "Вс: 10:00 — 14:00"],
  },
] as const;

const Contacts = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");

  const isFormValid = name.trim().length >= 2 && phone.trim().length >= 7;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setFormState("submitting");

    setTimeout(() => {
      setFormState("success");
      setName("");
      setPhone("");
      setMessage("");

      setTimeout(() => setFormState("idle"), 3000);
    }, 800);
  };

  const inputClassName =
    "w-full rounded-xl border border-gray-border bg-gray-bg px-4 py-3.5 text-sm text-dark-light outline-none transition-all duration-200 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 placeholder:text-gray-text";

  return (
    <section id="contacts" className="bg-gray-bg py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Контакты
          </p>
          <h2 className="text-3xl font-extrabold text-dark sm:text-4xl">
            Свяжитесь с нами
          </h2>
          <p className="mt-4 text-gray-text">
            Ответим на любые вопросы и поможем подобрать автомобиль
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-border bg-white p-8">
              <div className="space-y-6">
                {CONTACT_INFO.map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-semibold text-dark">
                        {item.title}
                      </p>
                      {item.lines.map((line, i) => {
                        const href = "hrefs" in item ? item.hrefs?.[i] : undefined;
                        if (href) {
                          return (
                            <a
                              key={line}
                              href={href}
                              className="block text-sm text-gray-text transition-colors hover:text-primary"
                            >
                              {line}
                            </a>
                          );
                        }
                        return (
                          <p key={line} className="text-sm text-gray-text">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-border shadow-sm">
              <iframe
                src="https://yandex.ru/map-widget/v1/?um=constructor%3Aeb93a51c0b2f7b5e2f3b8f9d3d0bce3e8f5f8c0a&source=constructor"
                width="100%"
                height="260"
                className="block"
                title="Карта — расположение автосалона TIGLEV.COM в Тольятти"
                loading="lazy"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-border bg-white p-8 lg:p-10">
            {formState === "success" ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-dark">
                  Заявка отправлена
                </h3>
                <p className="text-gray-text">
                  Мы свяжемся с вами в ближайшее время
                </p>
              </div>
            ) : (
              <>
                <h3 className="mb-2 text-xl font-bold text-dark">
                  Написать нам
                </h3>
                <p className="mb-8 text-sm text-gray-text">
                  Оставьте заявку, и мы перезвоним в течение 15 минут в рабочее
                  время
                </p>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-1.5 block text-sm font-medium text-dark"
                    >
                      Ваше имя <span className="text-primary">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Иван Иванов"
                      required
                      minLength={2}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="mb-1.5 block text-sm font-medium text-dark"
                    >
                      Телефон <span className="text-primary">*</span>
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 (___) ___-__-__"
                      required
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="mb-1.5 block text-sm font-medium text-dark"
                    >
                      Сообщение
                    </label>
                    <textarea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Интересует автомобиль..."
                      rows={4}
                      className={`${inputClassName} resize-none`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formState === "submitting" || !isFormValid}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:bg-primary-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                  >
                    {formState === "submitting" ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Отправить заявку
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-text">
                    Нажимая кнопку, вы соглашаетесь на обработку персональных
                    данных
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contacts;
