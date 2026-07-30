import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCarManager from "@/components/AdminCarManager";
import type { ManagedCar } from "@/components/AdminCarForm";

vi.mock("next/image", () => ({
  default: ({ fill, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

vi.mock("@/components/AppSelect", () => ({
  default: () => <button type="button">Выбрать</button>,
}));

const car: ManagedCar = {
  id: "car-1",
  brand: "BMW",
  model: "X5",
  price: 5_000_000,
  year: 2024,
  images: [{ url: "https://example.com/car.jpg", position: { x: 50, y: 50 } }],
  bodyType: "Кроссовер",
  engine: "Бензин",
  status: "active",
  sortOrder: 0,
};

describe("AdminCarManager", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ cars: [car] }) }));
  });

  it("opens editing when the car card itself is selected", async () => {
    render(<AdminCarManager />);

    const cardEditLink = await screen.findByRole("link", { name: "Редактировать BMW X5" });

    expect(cardEditLink).toHaveAttribute("href", "/admin/cars/car-1/edit");
  });

  it("removes a car from the active admin catalog after soft deletion", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ cars: [car] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ car: { ...car, deletedAt: "2026-07-30T12:00:00.000Z" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminCarManager />);

    await user.click(await screen.findByRole("button", { name: "В корзину" }));
    const deleteButtons = await screen.findAllByRole("button", { name: "В корзину" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => expect(screen.queryByText("BMW X5")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/cars/car-1", { method: "DELETE" });
  });

  it("shows deleted cars in the trash and restores them", async () => {
    const user = userEvent.setup();
    const deletedCar = { ...car, deletedAt: "2026-07-30T12:00:00.000Z" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ cars: [car] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cars: [deletedCar] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ car }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminCarManager />);

    await user.click(await screen.findByRole("button", { name: "Корзина" }));
    expect(await screen.findByText("Удалено")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Восстановить" }));

    await waitFor(() => expect(screen.queryByText("BMW X5")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/cars/car-1/restore", { method: "POST" });
  });
});
