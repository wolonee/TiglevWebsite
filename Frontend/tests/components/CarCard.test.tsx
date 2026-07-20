import { fireEvent, render, screen } from "@testing-library/react";
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
  images: ["https://images.unsplash.com/cover.jpg", "https://images.unsplash.com/inside.jpg", "https://images.unsplash.com/back.jpg"],
  bodyType: "Кроссовер", engine: "Бензин",
};

describe("CarCard", () => {
  it("starts preloading gallery photos only after the cover loads", () => {
    const { container } = render(<CarCard car={car} preloadCover />);
    expect(container.querySelectorAll("img")).toHaveLength(1);

    fireEvent.load(screen.getByAltText("BMW X5 2024"));

    expect(container.querySelectorAll("img")).toHaveLength(3);
  });
});
