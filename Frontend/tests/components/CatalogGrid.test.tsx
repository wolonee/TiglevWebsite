import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => vi.useRealTimers());

  it("filters cars after the price slider stops moving", () => {
    const { container } = render(<CatalogGrid cars={[car, expensiveCar]} />);

    expect(container.querySelector(".catalog-results > div")).toHaveClass("grid-cols-2");

    const priceSlider = screen.getByRole("slider", { name: "Цена до" });
    expect(priceSlider).toHaveAttribute("min", "0");
    expect(priceSlider).toHaveAttribute("max", "4000000");
    expect(screen.queryByRole("button", { name: "Найти" })).not.toBeInTheDocument();

    fireEvent.change(priceSlider, { target: { value: "3000000" } });

    expect(priceSlider.getAttribute("style")).toContain("75%");
    expect(screen.getByText("KIA Carnival")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(400));

    expect(screen.getByText("KIA Sorento")).toBeInTheDocument();
    expect(screen.queryByText("KIA Carnival")).not.toBeInTheDocument();
    expect(window.location.search).toBe("?max=3000000");
  });
});
