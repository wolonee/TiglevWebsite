"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, ImageIcon, LoaderCircle, RefreshCw } from "lucide-react";
import { requestStatusLabels, type CustomerRequest } from "@/data/adminRequests";

export default function AdminRequestManager() {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function load(nextPage = 1, append = false) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/requests?page=${nextPage}&limit=50`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить заявки");
      setRequests((current) => append ? [...current, ...(result.requests ?? [])] : (result.requests ?? []));
      setPage(nextPage);
      setTotal(result.pagination?.total ?? result.requests?.length ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Обращения клиентов</p>
            <h1 className="mt-3 text-3xl font-bold text-dark">Заявки</h1>
          </div>
          <button onClick={() => void load()} className="rounded-xl border border-gray-border bg-white p-3 text-gray-text hover:text-primary" aria-label="Обновить">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading && requests.length === 0 ? (
          <div className="py-16 text-center text-gray-text"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />Загружаем…</div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-border bg-white py-16 text-center text-gray-text">Заявок пока нет</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/admin/requests/${request.id}`}
                className="group rounded-2xl border border-gray-border bg-white p-4 transition-colors hover:border-primary sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-dark">{request.kind === "sell" ? "Продать авто" : "Написать нам"}</strong>
                    <p className="mt-2 text-sm text-gray-text">
                      {String(request.payload.firstName ?? request.payload.name ?? "Без имени")} · {String(request.payload.phone ?? "")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-text transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-text">
                  <span>{requestStatusLabels[request.status]}</span>
                  {request.note && <span className="font-medium text-primary">Есть заметка</span>}
                  {request.photoCount > 0 && <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{request.photoCount}</span>}
                  <span className="ml-auto">{new Date(request.createdAt).toLocaleString("ru-RU")}</span>
                </div>
              </Link>
            ))}
            {requests.length < total && <button type="button" disabled={loading} onClick={() => void load(page + 1, true)} className="rounded-xl border border-gray-border bg-white px-4 py-3 text-sm font-semibold text-dark disabled:opacity-50 lg:col-span-2">{loading ? "Загружаем…" : "Показать ещё"}</button>}
          </div>
        )}
    </section>
  );
}
