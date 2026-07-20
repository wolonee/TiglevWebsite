"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";

type FormState = "idle" | "submitting" | "success";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [submitError, setSubmitError] = useState("");
  const isFormValid = name.trim().length >= 2 && phone.trim().length >= 7;
  const inputClassName = "w-full rounded-xl border border-gray-border bg-gray-bg px-4 py-3.5 text-sm text-dark-light outline-none transition-colors focus:border-primary focus:bg-white placeholder:text-gray-text";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isFormValid) return;
    setSubmitError("");
    setFormState("submitting");
    try {
      const response = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, message, source: window.location.pathname }),
      });
      if (!response.ok) throw new Error("Request failed");
      setName("");
      setPhone("");
      setMessage("");
      setFormState("success");
    } catch {
      setSubmitError("Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.");
      setFormState("idle");
    }
  }

  if (formState === "success") {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
        <div className="success-icon mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50"><CheckCircle2 className="h-8 w-8 text-green-500" /></div>
        <h3 className="mb-2 text-xl font-bold text-dark">Заявка отправлена</h3>
        <p className="text-gray-text">Мы свяжемся с вами в ближайшее время</p>
        <button type="button" onClick={() => setFormState("idle")} className="mt-6 text-sm font-semibold text-primary">Отправить ещё одну</button>
      </div>
    );
  }

  return (
    <>
      <h3 className="mb-2 text-xl font-bold text-dark">Написать нам</h3>
      <p className="mb-8 text-sm text-gray-text">Оставьте заявку, и мы перезвоним в течение 15 минут в рабочее время</p>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {submitError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-primary/20 bg-red-50 p-4 text-sm text-primary"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{submitError}</div>}
        <label className="block text-sm font-medium text-dark" htmlFor="contact-name">Ваше имя <span className="text-primary">*</span><input id="contact-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Иван Иванов" required minLength={2} className={`${inputClassName} mt-1.5`} /></label>
        <label className="block text-sm font-medium text-dark" htmlFor="contact-phone">Телефон <span className="text-primary">*</span><input id="contact-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+7 (___) ___-__-__" required className={`${inputClassName} mt-1.5`} /></label>
        <label className="block text-sm font-medium text-dark" htmlFor="contact-message">Сообщение<textarea id="contact-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Интересует автомобиль..." rows={4} className={`${inputClassName} mt-1.5 resize-none`} /></label>
        <button type="submit" disabled={formState === "submitting" || !isFormValid} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60">
          {formState === "submitting" ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Отправка...</> : <><Send className="h-4 w-4" />Отправить заявку</>}
        </button>
        <p className="text-center text-xs text-gray-text">Нажимая кнопку, вы соглашаетесь на обработку персональных данных</p>
      </form>
    </>
  );
}
