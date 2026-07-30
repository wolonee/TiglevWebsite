"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body style={{ alignItems: "center", background: "#f8fafc", color: "#0f172a", display: "flex", fontFamily: "Arial, sans-serif", justifyContent: "center", margin: 0, minHeight: "100dvh", padding: "1rem" }}>
        <main role="alert" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "1rem", maxWidth: "32rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Что-то пошло не так</h1>
          <p style={{ color: "#64748b", lineHeight: 1.5 }}>Не удалось загрузить сайт. Попробуйте открыть его ещё раз.</p>
          <button type="button" onClick={reset} style={{ background: "#c41e24", border: 0, borderRadius: ".75rem", color: "#fff", cursor: "pointer", fontSize: "1rem", fontWeight: 600, padding: ".8rem 1.2rem" }}>Повторить</button>
        </main>
      </body>
    </html>
  );
}
