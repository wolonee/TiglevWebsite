import { fireEvent, render, screen } from "@testing-library/react";
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

const expensiveCar: Car = { ...car, id: "car-2", model: "Carnival", price: 4_000_000 };

describe("CatalogGrid", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
    });
  });

  it("filters cars immediately with a price slider", () => {
    render(<CatalogGrid cars={[car, expensiveCar]} />);

    const priceSlider = screen.getByRole("slider", { name: "Цена до" });
    expect(priceSlider).toHaveAttribute("min", "0");
    expect(priceSlider).toHaveAttribute("max", "4000000");
    expect(screen.queryByRole("button", { name: "Найти" })).not.toBeInTheDocument();

    fireEvent.change(priceSlider, { target: { value: "3000000" } });

    expect(screen.getByText("KIA Sorento")).toBeInTheDocument();
    expect(screen.queryByText("KIA Carnival")).not.toBeInTheDocument();
    expect(window.location.search).toBe("?max=3000000");
  });
});
