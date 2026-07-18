import { afterEach, describe, expect, it, vi } from "vitest";
import { cars, formatPrice, getCatalogCars } from "@/data/cars";
import { getCarGallery } from "@/data/carGallery";

describe("catalog data", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("formats prices for the Russian catalog", () => {
    expect(formatPrice(3750000)).toBe("3 750 000 ₽");
  });

  it("uses the uploaded images as a gallery without adding stock photos", () => {
    const imageUrls = ["https://example.com/cover.jpg", "https://example.com/inside.jpg"];
    expect(getCarGallery({ ...cars[0], images: imageUrls })).toEqual(imageUrls);
  });

  it("keeps stock cars visible when the backend is unavailable", async () => {
    vi.stubEnv("BACKEND_URL", "https://backend.example.com");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(getCatalogCars()).resolves.toEqual(cars);
  });

  it("uses the stored catalog without duplicating stock cars", async () => {
    vi.stubEnv("BACKEND_URL", "https://backend.example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ cars: [{
      id: "db-car", brand: "BMW", model: "X5", price: 5000000, year: 2024,
      images: ["https://example.com/x5.jpg"], bodyType: "Кроссовер", engine: "Бензин",
    }] }))));

    const result = await getCatalogCars();
    expect(result[0]).toMatchObject({ id: "db-car", image: "https://example.com/x5.jpg" });
    expect(result).toHaveLength(1);
  });
});
