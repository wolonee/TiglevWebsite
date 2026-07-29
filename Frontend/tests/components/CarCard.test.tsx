import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import CarCard from "@/components/CarCard";
import type { Car } from "@/data/cars";

vi.mock("next/image", () => ({
  default: ({ fill, preload, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean }) => {
    void fill; void preload;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

const car: Car = {
  id: "car-1", brand: "BMW", model: "X5", price: 5000000, year: 2024,
  image: "https://images.unsplash.com/cover.jpg",
  images: [
    { url: "https://images.unsplash.com/cover.jpg", position: { x: 50, y: 50 } },
    { url: "https://images.unsplash.com/inside.jpg", position: { x: 50, y: 50 } },
    { url: "https://images.unsplash.com/back.jpg", position: { x: 50, y: 50 } },
  ],
  bodyType: "Кроссовер", engine: "Бензин",
};

describe("CarCard", () => {
  it("preloads gallery photos when the browser has idle time after the cover loads", () => {
    vi.useFakeTimers();
    const { container } = render(<CarCard car={car} preloadCover />);
    expect(container.querySelectorAll("img")).toHaveLength(1);

    fireEvent.load(screen.getByAltText("BMW X5 2024"));
    expect(container.querySelectorAll("img")).toHaveLength(1);

    act(() => { vi.advanceTimersByTime(500); });
    expect(container.querySelectorAll("img")).toHaveLength(3);
    vi.useRealTimers();
  });

  it("uses the stored focal point for the catalog cover", () => {
    render(<CarCard car={{ ...car, images: [{ ...car.images![0], position: { x: 20, y: 80 } }] }} />);

    expect(screen.getByAltText("BMW X5 2024")).toHaveStyle({ objectPosition: "20% 80%" });
  });

  it("reserves space for a two-line description in every catalog card", () => {
    const description = "Подробное описание автомобиля, которое в каталоге ограничивается двумя строками.";
    render(<CarCard car={{ ...car, description }} />);

    expect(screen.getByText(description)).toHaveClass("line-clamp-2", "min-h-10");
  });

  it("ends long catalog descriptions without rendering their continuation", () => {
    const continuation = "Продолжение, которое не должно попасть в карточку каталога.";
    const description = `${"Длинное описание автомобиля ".repeat(8)}${continuation}`;
    render(<CarCard car={{ ...car, description }} />);

    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
    expect(screen.queryByText(continuation)).not.toBeInTheDocument();
  });
});
