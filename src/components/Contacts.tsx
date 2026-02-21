"use client";

import { useState } from "react";
import { MapPin, Phone, Clock, Send } from "lucide-react";

const Contacts = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Спасибо! Мы свяжемся с вами в ближайшее время.");
    setName("");
    setPhone("");
    setMessage("");
  };

  return (
    <section id="contacts" className="bg-gray-bg py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Контакты
          </p>
          <h2 className="text-3xl font-extrabold text-dark sm:text-4xl">
            Свяжитесь с нами
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Contact info + Map */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-border bg-white p-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-dark">Адрес</p>
                    <p className="text-gray-text">
                      Тольятти, Офицерская ул. 46, ГСК 66
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-dark">Телефон</p>
                    <a
                      href="tel:+78482750750"
                      className="text-gray-text transition-colors hover:text-primary"
                    >
                      +7 (8482) 750-750
                    </a>
                    <br />
                    <a
                      href="tel:88005000015"
                      className="text-gray-text transition-colors hover:text-primary"
                    >
                      8-800-500-0015
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-dark">Режим работы</p>
                    <p className="text-gray-text">Будни: 9:00 — 18:00</p>
                    <p className="text-gray-text">Суббота: 9:00 — 17:00</p>
                    <p className="text-gray-text">Воскресенье: 10:00 — 14:00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="overflow-hidden rounded-2xl border border-gray-border">
              <iframe
                src="https://yandex.ru/map-widget/v1/?um=constructor%3Aeb93a51c0b2f7b5e2f3b8f9d3d0bce3e8f5f8c0a&source=constructor"
                width="100%"
                height="250"
                className="block"
                title="Карта — расположение автосалона TIGLEV"
                loading="lazy"
              />
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-gray-border bg-white p-8 lg:p-10">
            <h3 className="mb-2 text-xl font-bold text-dark">Написать нам</h3>
            <p className="mb-8 text-gray-text">
              Оставьте заявку, и мы свяжемся с вами в ближайшее время
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-1.5 block text-sm font-medium text-dark"
                >
                  Ваше имя
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иван Иванов"
                  required
                  className="w-full rounded-xl border border-gray-border bg-gray-bg px-4 py-3.5 text-sm text-dark-light outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-text"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-phone"
                  className="mb-1.5 block text-sm font-medium text-dark"
                >
                  Телефон
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  required
                  className="w-full rounded-xl border border-gray-border bg-gray-bg px-4 py-3.5 text-sm text-dark-light outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-text"
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
                  className="w-full resize-none rounded-xl border border-gray-border bg-gray-bg px-4 py-3.5 text-sm text-dark-light outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-text"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-white transition-all hover:bg-primary-dark hover:shadow-lg"
              >
                <Send className="h-4 w-4" />
                Отправить заявку
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contacts;
