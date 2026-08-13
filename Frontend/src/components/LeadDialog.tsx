"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import type { Car } from "@/data/cars";
import { formatPrice } from "@/data/cars";
import Button from "./ui/Button";
import { CONTROL_BASE, FieldLabel } from "./ui/Field";

/**
 * Заявка на конкретный автомобиль: имя, телефон, комментарий.
 *
 * Мессенджеров здесь нет намеренно. Они стоят снаружи, прямо под кнопкой,
 * которая это окно открывает: человек уже выбрал «оставить номер», предлагать
 * ему в том же окне ещё три способа связи — значит заставлять выбирать заново.
 *
 * Заявка уходит в `/api/contact-requests`: попадает в админку, в Telegram
 * админам и на почту. Почта — только сигнал «пришла заявка», переписки там нет.
 */

type LeadDialogProps = {
  car: Car;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = "idle" | "submitting" | "success";

export default function LeadDialog({ car, open, onOpenChange }: LeadDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  const title = [car.brand, car.model].filter(Boolean).join(" ");
  const isValid = name.trim().length >= 2 && phone.trim().length >= 7;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid) return;
    setError("");
    setFormState("submitting");
    try {
      const response = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          message: comment,
          source: window.location.pathname,
          // Плоские строки, а не вложенный объект: заявку показывает админка,
          // Telegram и письмо — все три печатают значения как есть.
          carTitle: [title, car.year || null].filter(Boolean).join(", "),
          carPrice: formatPrice(car.price),
          carUrl: window.location.href,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setFormState("success");
    } catch {
      setError("Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в мессенджер.");
      setFormState("idle");
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-[120] bg-dark/45 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="dialog-content fixed left-1/2 top-1/2 z-[121] max-h-[calc(100dvh-2rem)] w-[min(calc(100%_-_2rem),30rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-border bg-white p-5 shadow-2xl focus:outline-none sm:p-7">
          <DialogPrimitive.Close
            aria-label="Закрыть"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-gray-text transition-colors hover:bg-gray-bg hover:text-dark"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>

          {formState === "success" ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <DialogPrimitive.Title className="text-xl font-bold text-dark">Заявка отправлена</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-2 text-gray-text">
                Свяжемся с вами по телефону {phone}. Если удобнее переписка — кнопки
                мессенджеров под этим окном.
              </DialogPrimitive.Description>
            </div>
          ) : (
            <>
              <DialogPrimitive.Title className="pr-10 text-xl font-bold text-dark">
                Заявка на {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-gray-text">
                {[car.year ? `${car.year} год` : null, formatPrice(car.price)].filter(Boolean).join(" · ")}
              </DialogPrimitive.Description>

              <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
                {error ? (
                  <p role="alert" className="flex items-start gap-2 rounded-lg border border-primary/20 bg-red-50 p-3 text-sm text-primary">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </p>
                ) : null}

                <label className="block">
                  <FieldLabel>Имя *</FieldLabel>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Иван"
                    required
                    minLength={2}
                    className={CONTROL_BASE}
                  />
                </label>
                <label className="block">
                  <FieldLabel>Телефон *</FieldLabel>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    required
                    className={CONTROL_BASE}
                  />
                </label>
                <label className="block">
                  <FieldLabel>Комментарий</FieldLabel>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={3}
                    placeholder="Когда удобно позвонить, что уточнить по автомобилю"
                    className={`${CONTROL_BASE} h-auto resize-none py-2.5`}
                  />
                </label>

                <Button type="submit" block size="lg" disabled={formState === "submitting" || !isValid}>
                  {formState === "submitting" ? "Отправляем…" : "Отправить заявку"}
                </Button>
                <p className="text-center text-xs text-gray-text">
                  Нажимая кнопку, вы соглашаетесь на обработку персональных данных
                </p>
              </form>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
