import { NextResponse } from "next/server";

// ВРЕМЕННО. Проверяем, пускает ли CarClick запросы с адресов Vercel.
// Синхронизация каталога сейчас ходит через платный прокси — если Vercel
// проходит напрямую, эту зависимость можно убрать. Удалить после проверки.
export const dynamic = "force-dynamic";

export async function GET() {
  const target = "https://carclick.ru/api/v1/market/lots?status=active&page=1&limit=1";
  const startedAt = Date.now();
  try {
    const upstream = await fetch(target, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://carclick.ru/marketplace",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const body = await upstream.text();
    let totalLots: number | null = null;
    try {
      totalLots = JSON.parse(body)?.meta?.total ?? null;
    } catch {
      totalLots = null;
    }
    return NextResponse.json({
      status: upstream.status,
      passed: upstream.ok,
      elapsedMs: Date.now() - startedAt,
      totalLots,
      region: process.env.VERCEL_REGION ?? null,
      bodyStart: body.slice(0, 160),
    });
  } catch (error) {
    return NextResponse.json(
      {
        passed: false,
        elapsedMs: Date.now() - startedAt,
        region: process.env.VERCEL_REGION ?? null,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
