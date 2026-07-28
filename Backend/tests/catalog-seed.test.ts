import { describe, expect, it } from "vitest";
import { catalogSeed, legacyCatalogIds } from "../src/catalog-seed.js";

describe("catalog seed", () => {
  it("contains the imported real cars in the source order", () => {
    expect(catalogSeed).toHaveLength(9);
    expect(catalogSeed[0]?.id).toBe("kia-sorento-2017");
    expect(catalogSeed.at(-1)?.id).toBe("lada-vesta-sport-2021");
    expect(catalogSeed.map((car) => car.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("uses only local catalog images", () => {
    const images = catalogSeed.flatMap((car) => car.images);
    expect(images).toHaveLength(76);
    expect(images.every((image) => image.startsWith("/images/catalog/"))).toBe(true);
  });

  it("keeps legacy mock identifiers separate for migration cleanup", () => {
    expect(legacyCatalogIds).toContain("151698");
    expect(catalogSeed.some((car) => legacyCatalogIds.includes(car.id as never))).toBe(false);
  });
});
