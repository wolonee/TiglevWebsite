"use client";

import { useState } from "react";
import Image from "next/image";
import { Send, CheckCircle2 } from "lucide-react";
import ContactList from "./ContactList";
import SectionHeading from "./SectionHeading";

type FormState = "idle" | "submitting" | "success";

const Contacts = ({ hideHeading = false }: { hideHeading?: boolean }) => {
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
        {!hideHeading && <SectionHeading eyebrow="Контакты" title="Свяжитесь с нами" description="Ответим на любые вопросы и поможем подобрать автомобиль" className="mb-14" />}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="h-full">
            <div className="h-full rounded-2xl border border-gray-border bg-white p-8 lg:p-10">
              <ContactList />
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
        <SectionHeading eyebrow="Где нас найти" title="Местоположение" className="mb-10 mt-16" />
        <div className="grid overflow-hidden rounded-[20px] border border-gray-border bg-white lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-0.5 bg-gray-border"><div className="relative col-span-2 aspect-[2/1]"><Image src="/images/autosalon-2.jpg" alt="Автосалон TIGLEV.COM — здание" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw"/></div><div className="relative aspect-[4/3]"><Image src="/images/autosalon-1.jpg" alt="Автосалон TIGLEV.COM — вид с дороги" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw"/></div><div className="relative aspect-[4/3]"><Image src="/images/autosalon-3.jpg" alt="Автосалон TIGLEV.COM — вход" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw"/></div></div>
          <iframe src="https://yandex.ru/map-widget/v1/?text=Тольятти%2C%20Офицерская%20улица%2C%2046&z=16" className="h-full min-h-[420px] w-full self-stretch" title="Карта — расположение автосалона TIGLEV.COM в Тольятти" loading="lazy" />
        </div>
      </div>
    </section>
  );
};

export default Contacts;
