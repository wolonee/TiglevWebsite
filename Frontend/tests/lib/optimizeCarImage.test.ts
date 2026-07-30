import { afterEach, describe, expect, it, vi } from "vitest";
import { optimizeCarImage } from "@/lib/optimizeCarImage";

describe("optimizeCarImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("converts and resizes a large photo to WebP", async () => {
    const close = vi.fn();
    const bitmap = { width: 4000, height: 2000, close };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));

    const drawImage = vi.fn();
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["optimized"], { type: "image/webp" }));
    });
    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    const source = new File(["source"], "КИА Sorento.JPG", {
      type: "image/jpeg",
      lastModified: 123,
    });
    const result = await optimizeCarImage(source);

    expect(createImageBitmap).toHaveBeenCalledWith(source, { imageOrientation: "from-image" });
    expect(canvas.width).toBe(3000);
    expect(canvas.height).toBe(1500);
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 3000, 1500);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.9);
    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("----Sorento.webp");
    expect(close).toHaveBeenCalled();
  });

  it("keeps an already suitable WebP without re-encoding it", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
      width: 2400,
      height: 1600,
      close,
    }));
    const createElement = vi.spyOn(document, "createElement");
    const source = new File(["webp"], "car.webp", {
      type: "image/webp",
      lastModified: 456,
    });

    const result = await optimizeCarImage(source);

    expect(createElement).not.toHaveBeenCalled();
    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("car.webp");
    expect(result.lastModified).toBe(456);
    expect(close).toHaveBeenCalled();
  });
});
