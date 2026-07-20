import { LoaderCircle } from "lucide-react";

export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-gray-text">
      <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">Загружаем раздел…</p>
    </div>
  );
}
