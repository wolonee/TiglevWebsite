import { describe, expect, it } from "vitest";
import { imageObjectPosition, normalizeCarImage } from "@/data/carImages";

describe("catalog image focal point", () => {
  it("keeps stored focal points", () => {
    const image = normalizeCarImage({ url: "https://example.com/car.jpg", position: { x: 18, y: 72 } });

    expect(imageObjectPosition(image)).toBe("18% 72%");
  });

  it("centers legacy string image URLs", () => {
    expect(normalizeCarImage("https://example.com/car.jpg")).toEqual({
      url: "https://example.com/car.jpg",
      position: { x: 50, y: 50 },
    });
  });
});
