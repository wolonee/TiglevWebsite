import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CatalogGrid from "@/components/CatalogGrid";
import type { Car } from "@/data/cars";

vi.mock("@/components/CarCard", () => ({
  default: ({ car }: { car: Car }) => <article>{car.brand} {car.model}</article>,
}));

const car: Car = {
  id: "car-1",
  brand: "KIA",
  model: "Sorento",
  price: 2_850_000,
  year: 2017,
  image: "/car.webp",
  bodyType: "Кроссовер",
  engine: "Бензин",
};

describe("CatalogGrid", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
    });
  });

  it("shows only price filters without a filter toggle", () => {
    render(<CatalogGrid cars={[car]} />);

    expect(screen.getByPlaceholderText("Цена от, ₽")).toBeVisible();
    expect(screen.getByPlaceholderText("Цена до, ₽")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Фильтры" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Марка автомобиля")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Тип кузова")).not.toBeInTheDocument();
  });
});
