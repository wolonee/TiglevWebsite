import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-bg text-gray-text" role="status" aria-live="polite">
      <LoaderCircle className="mr-3 h-6 w-6 animate-spin text-primary" />
      Загружаем страницу…
    </main>
  );
}
