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

  it("contains only the imported real catalog and its local photos", () => {
    expect(cars).toHaveLength(9);
    expect(cars.map((car) => car.id)).toContain("kia-sorento-2017");
    expect(cars.map((car) => car.id)).not.toContain("151698");
    expect(cars.flatMap((car) => car.images ?? [])).toHaveLength(76);
    expect(cars.flatMap((car) => car.images ?? []).every((image) => image.startsWith("/images/catalog-hq/"))).toBe(true);
  });

  it("does not invent unavailable characteristics", () => {
    const cerato = cars.find((car) => car.id === "kia-cerato-2006");
    expect(cerato).toMatchObject({ bodyType: "", engine: "" });
    expect(cerato?.mileage).toBeUndefined();
  });

  it("keeps real cars visible when the backend is unavailable", async () => {
    vi.stubEnv("BACKEND_URL", "https://backend.example.com");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(getCatalogCars()).resolves.toEqual(cars);
  });

  it("uses the stored catalog without duplicating fallback cars", async () => {
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
