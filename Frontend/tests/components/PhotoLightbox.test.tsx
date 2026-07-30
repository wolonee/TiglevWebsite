import { fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import PhotoLightbox from "@/components/PhotoLightbox";

vi.mock("next/image", () => ({
  default: ({ fill, preload, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean }) => {
    void fill;
    void preload;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

const images = [
  { url: "https://images.unsplash.com/first.jpg", position: { x: 50, y: 50 } },
  { url: "https://images.unsplash.com/second.jpg", position: { x: 50, y: 50 } },
];

describe("PhotoLightbox", () => {
  it("opens a full-size photo and supports keyboard navigation", () => {
    const onStep = vi.fn();
    render(<PhotoLightbox activeIndex={0} alt="BMW X5" images={images} open onOpenChange={vi.fn()} onStep={onStep} />);

    expect(screen.getByAltText("BMW X5")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onStep).toHaveBeenCalledWith(1);
  });
});
