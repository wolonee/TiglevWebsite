import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminRequestManager from "@/components/AdminRequestManager";

const customerRequest = {
  id: "request-1",
  kind: "sell" as const,
  status: "new" as const,
  payload: { firstName: "Иван", phone: "+79990000000" },
  photoCount: 0,
  photoUrls: [],
  note: "Перезвонить после обеда",
  createdAt: "2026-07-30T12:00:00.000Z",
};

describe("AdminRequestManager", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ requests: [customerRequest], pagination: { total: 1 } }), { status: 200 }),
    ));
  });

  it("opens every request on its own details page", async () => {
    render(<AdminRequestManager />);

    // Ссылка стоит на имени, а не на карточке целиком: блок-ссылка не даёт
    // ни выделить текст, ни осмысленно открыть заявку в новой вкладке.
    expect(await screen.findByRole("link", { name: "Иван" })).toHaveAttribute(
      "href",
      "/admin/requests/request-1",
    );
    expect(screen.getByText(/Перезвонить после обеда/)).toBeInTheDocument();
  });

  it("называет состояние заявки словом, а не только цветом", async () => {
    render(<AdminRequestManager />);

    // Цвет метки — подсказка, но не единственный носитель смысла:
    // так состояние доступно и при монохромном зрении, и читалке экрана.
    expect(await screen.findByText("Новая")).toBeInTheDocument();
    expect(screen.getByText(/Не просмотрено: 1 из 1/)).toBeInTheDocument();
  });
});
