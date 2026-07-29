import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CatalogGrid from "@/components/CatalogGrid";
import type { Car } from "@/data/cars";

vi.mock("@/components/CarCard", () => ({
  default: ({ car }: { car: Car }) => <article>{car.brand} {car.model}</article>,
}));

vi.mock("@/components/AppSelect", () => ({
  default: ({ ariaLabel }: { ariaLabel: string }) => <button type="button" aria-label={ariaLabel}>Выбрать</button>,
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

  it("keeps filters collapsed until the mobile filter control is pressed", () => {
    const { container } = render(<CatalogGrid cars={[car]} />);
    const filters = container.querySelector("#catalog-filters");

    expect(filters).toHaveClass("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
    expect(filters).toHaveClass("grid");
    expect(screen.getByRole("button", { name: "Скрыть фильтры" })).toHaveAttribute("aria-expanded", "true");
  });
});
