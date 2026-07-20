"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, MessageSquare, RefreshCw } from "lucide-react";

type RequestStatus = "new" | "in_progress" | "completed" | "archived";
type CustomerRequest = { id: string; kind: "contact" | "sell"; status: RequestStatus; payload: Record<string, unknown>; photoCount: number; note?: string; createdAt: string };
const statusLabels: Record<RequestStatus, string> = { new: "Новая", in_progress: "В работе", completed: "Завершена", archived: "Архив" };

export default function AdminRequestManager() {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [selected, setSelected] = useState<CustomerRequest | null>(null);
  const [status, setStatus] = useState<RequestStatus>("new");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function load(nextPage = 1, append = false) {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/requests?page=${nextPage}&limit=50`, { cache: "no-store" }); const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить заявки");
      setRequests((current) => append ? [...current, ...(result.requests ?? [])] : (result.requests ?? []));
      setPage(nextPage);
      setTotal(result.pagination?.total ?? result.requests?.length ?? 0);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить заявки"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  function choose(request: CustomerRequest) { setSelected(request); setStatus(request.status); setNote(request.note ?? ""); }

  async function save() {
    if (!selected) return; setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/requests/${selected.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, note }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить заявку");
      setRequests((current) => current.map((item) => item.id === selected.id ? result.request : item)); setSelected(result.request);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить заявку"); }
    finally { setSaving(false); }
  }

  return <div className="grid gap-8 lg:items-stretch lg:grid-cols-[.9fr_1.1fr]"><section><div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">Обращения клиентов</p><h1 className="mt-3 text-3xl font-bold text-dark">Заявки</h1></div><button onClick={() => void load()} className="rounded-xl border border-gray-border bg-white p-3 text-gray-text hover:text-primary" aria-label="Обновить"><RefreshCw className="h-5 w-5" /></button></div>{error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{loading && requests.length === 0 ? <div className="py-16 text-center text-gray-text"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />Загружаем…</div> : requests.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-border bg-white py-16 text-center text-gray-text">Заявок пока нет</div> : <div className="space-y-3">{requests.map((request) => <button key={request.id} onClick={() => choose(request)} className={`w-full rounded-2xl border p-4 text-left transition-colors ${selected?.id === request.id ? "border-primary bg-red-50" : "border-gray-border bg-white hover:border-primary"}`}><div className="flex items-center justify-between gap-3"><strong className="text-dark">{request.kind === "sell" ? "Продать авто" : "Написать нам"}</strong><span className="text-xs text-gray-text">{statusLabels[request.status]}</span></div><p className="mt-2 truncate text-sm text-gray-text">{String(request.payload.firstName ?? request.payload.name ?? "Без имени")} · {String(request.payload.phone ?? "")}</p><p className="mt-1 text-xs text-gray-text">{new Date(request.createdAt).toLocaleString("ru-RU")}</p></button>)}{requests.length < total && <button type="button" disabled={loading} onClick={() => void load(page + 1, true)} className="w-full rounded-xl border border-gray-border bg-white px-4 py-3 text-sm font-semibold text-dark disabled:opacity-50">{loading ? "Загружаем…" : "Показать ещё"}</button>}</div>}</section><section className="h-full rounded-2xl border border-gray-border bg-white p-6 sm:p-8">{selected ? <><div className="flex items-center gap-2 text-primary"><MessageSquare className="h-5 w-5" /><span className="font-semibold">{selected.kind === "sell" ? "Заявка на продажу автомобиля" : "Сообщение клиента"}</span></div><dl className="mt-6 space-y-3">{Object.entries(selected.payload).map(([key, value]) => <div key={key} className="flex gap-4 border-b border-gray-border pb-3 text-sm"><dt className="w-36 shrink-0 text-gray-text">{key}</dt><dd className="whitespace-pre-wrap font-medium text-dark">{String(value || "—")}</dd></div>)}{selected.photoCount > 0 && <div className="text-sm text-gray-text">Прикреплено фотографий: {selected.photoCount}</div>}</dl><div className="mt-6 grid gap-4"><label className="text-sm font-medium text-dark">Статус<select value={status} onChange={(event) => setStatus(event.target.value as RequestStatus)} className="mt-2 w-full rounded-xl border border-gray-border px-4 py-3 outline-none focus:border-primary"><option value="new">Новая</option><option value="in_progress">В работе</option><option value="completed">Завершена</option><option value="archived">Архив</option></select></label><label className="text-sm font-medium text-dark">Заметка администратора<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-gray-border px-4 py-3 outline-none focus:border-primary" /></label><button disabled={saving} onClick={() => void save()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}Сохранить</button></div></> : <div className="flex h-full min-h-80 flex-col items-center justify-center text-center text-gray-text"><MessageSquare className="mb-3 h-8 w-8" />Выберите заявку слева, чтобы посмотреть детали</div>}</section></div>;
}
