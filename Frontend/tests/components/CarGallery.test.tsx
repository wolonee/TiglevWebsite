import { fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import CarGallery from "@/components/CarGallery";

vi.mock("next/image", () => ({
  default: ({ fill, preload, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean }) => {
    void fill;
    void preload;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

const images = [
  { url: "https://images.unsplash.com/cover.jpg", position: { x: 50, y: 50 } },
  { url: "https://images.unsplash.com/inside.jpg", position: { x: 50, y: 50 } },
  { url: "https://images.unsplash.com/back.jpg", position: { x: 50, y: 50 } },
];

describe("CarGallery", () => {
  it("preloads the full gallery after the first product photo is ready", () => {
    const { container } = render(<CarGallery images={images} alt="BMW X5" />);
    expect(container.querySelectorAll("img")).toHaveLength(4);

    fireEvent.load(screen.getByAltText("BMW X5"));
    expect(container.querySelectorAll("img")).toHaveLength(6);
  });
});
