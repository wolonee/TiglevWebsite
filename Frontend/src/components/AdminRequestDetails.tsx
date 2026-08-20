"use client";

import Image from "next/image";
import { imageVariants } from "@/data/imageVariants";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import {
  requestFieldLabels,
  requestStatusHints,
  requestStatusLabels,
  requestStatusTones,
  type CustomerRequest,
  type RequestStatus,
} from "@/data/adminRequests";

export default function AdminRequestDetails({ initialRequest }: { initialRequest: CustomerRequest }) {
  const [request, setRequest] = useState(initialRequest);
  const [status, setStatus] = useState<RequestStatus>(initialRequest.status);
  const [note, setNote] = useState(initialRequest.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  /**
   * Открыли новую заявку — она становится просмотренной.
   *
   * Единственный переход, который делается сам: он отвечает на вопрос «до
   * этой уже дошли руки?», и требовать ради него отдельного нажатия значит
   * получать список, где половина заявок вечно «новые». Всё остальное —
   * «в работе», «завершена», «архив» — администратор ставит сам.
   */
  const marked = useRef(false);
  useEffect(() => {
    if (request.status !== "new" || marked.current) return;
    marked.current = true;
    void fetch(`/api/admin/requests/${request.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "viewed" }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!result?.request) return;
        setRequest(result.request);
        // Значение в селекте двигаем только если администратор его ещё не трогал.
        setStatus((current) => (current === "new" ? "viewed" : current));
      })
      .catch(() => {
        // Молча: пометка о просмотре не стоит того, чтобы пугать ошибкой.
      });
  }, [request.id, request.status]);

  async function save() {
    setSaving(true);
    setError("");
    setSaveMessage("");
    try {
      const response = await fetch(`/api/admin/requests/${request.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить заявку");
      setRequest(result.request);
      setStatus(result.request.status);
      setNote(result.request.note ?? "");
      setSaveMessage("Заметка и статус сохранены");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить заявку");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/requests" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-text hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        К списку заявок
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <section className="rounded-2xl border border-gray-border bg-white p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">
                {request.kind === "sell" ? "Заявка на продажу автомобиля" : "Сообщение клиента"}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-dark sm:text-3xl">
                {String(request.payload.firstName ?? request.payload.name ?? "Клиент")}
              </h1>
              <p className="mt-2 text-sm text-gray-text">
                {new Date(request.createdAt).toLocaleString("ru-RU")}
              </p>
            </div>
            <Badge tone={requestStatusTones[request.status]} className="h-7 px-3 text-sm">
              {requestStatusLabels[request.status]}
            </Badge>
          </div>

          <dl className="mt-7 divide-y divide-gray-border">
            {Object.entries(request.payload).map(([key, value]) => (
              <div key={key} className="grid gap-1 py-3 text-sm sm:grid-cols-[160px_1fr] sm:gap-5">
                <dt className="text-gray-text">{requestFieldLabels[key] ?? key}</dt>
                <dd className="whitespace-pre-wrap font-medium text-dark">
                  {/* Ссылку на автомобиль менеджер открывает — не заставляем копировать её руками.
                      Схему проверяет backend, сюда доходят только http(s). */}
                  {typeof value === "string" && /^https?:\/\//.test(value) ? (
                    <a href={value} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                      {value}
                    </a>
                  ) : (
                    String(value || "Не указано")
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {request.photoCount > 0 && (
            <section className="mt-7">
              <h2 className="font-semibold text-dark">Фотографии автомобиля ({request.photoCount})</h2>
              {request.photoUrls.length > 0 ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {request.photoUrls.map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-gray-border bg-gray-bg"
                      >
                        <Image
                          src={url}
                          alt={`Фотография автомобиля ${index + 1}`}
                          fill
                          quality={imageVariants.thumbnail.quality}
                          sizes="(max-width: 640px) 45vw, 240px"
                          className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        />
                      </a>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-text">Нажмите на фотографию, чтобы открыть оригинал.</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-text">Файлы этой старой заявки не были сохранены.</p>
              )}
            </section>
          )}
        </section>

        <aside className="self-start rounded-2xl border border-gray-border bg-white p-5 sm:p-6 lg:sticky lg:top-6">
          <h2 className="text-lg font-bold text-dark">Работа с заявкой</h2>
          <p className="mt-1 text-sm text-gray-text">Заметка видна только администраторам.</p>

          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="mt-5 space-y-5">
            <label className="block text-sm font-medium text-dark">
              Статус
              <select
                value={status}
                onChange={(event) => { setStatus(event.target.value as RequestStatus); setSaveMessage(""); }}
                className="mt-2 w-full rounded-xl border border-gray-border bg-white px-4 py-3 outline-none focus:border-primary"
              >
                {Object.entries(requestStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="mt-1.5 block text-xs font-normal text-gray-text">
                {requestStatusHints[status]}
              </span>
            </label>

            <label className="block text-sm font-medium text-dark">
              Заметка администратора
              <textarea
                value={note}
                onChange={(event) => { setNote(event.target.value); setSaveMessage(""); }}
                rows={8}
                placeholder="Например: перезвонить клиенту после 15:00"
                className="mt-2 w-full resize-y rounded-xl border border-gray-border px-4 py-3 outline-none focus:border-primary"
              />
            </label>

            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Сохранить
            </button>
            {saveMessage && <p role="status" className="text-sm font-medium text-emerald-700">{saveMessage}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
