import { NextResponse } from "next/server";
import { fetchCatalogPage, PAGE_SIZE } from "@/data/catalogRepo";
import { parseFilters } from "@/lib/catalogFilters";

/**
 * Следующие страницы ленты каталога.
 *
 * Первую страницу отдаёт серверный компонент — она попадает в HTML и в поиск.
 * Сюда лента обращается только при прокрутке, передавая курсор: id последней
 * показанной карточки.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filters = parseFilters(params);

  const rawCursor = params.get("cursor");
  const cursor = rawCursor && /^\d+$/.test(rawCursor) ? Number(rawCursor) : undefined;

  // «В наличии» — это девять своих машин, они целиком помещаются на первую
  // страницу с сервера. Продолжения у такой ленты нет, в каталог не ходим.
  if (filters.avail.length && !filters.avail.includes("order")) {
    return NextResponse.json({ cars: [], nextCursor: null });
  }

  try {
    const page = await fetchCatalogPage(filters, cursor, PAGE_SIZE);
    return NextResponse.json(page, {
      // Лента одинакова для всех, но каталог живой: минуты кеша достаточно,
      // чтобы снять нагрузку и не показывать вчерашние цены.
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Не удалось прочитать каталог:", error);
    return NextResponse.json({ error: "Каталог временно недоступен" }, { status: 503 });
  }
}
