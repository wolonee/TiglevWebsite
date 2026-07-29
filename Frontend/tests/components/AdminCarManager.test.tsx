import { render, screen } from "@testing-library/react";
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
});
