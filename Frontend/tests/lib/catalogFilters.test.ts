import { describe, expect, it } from "vitest";
import type { Car } from "@/data/cars";
import {
  countActive,
  emptyFilters,
  matchesFilters,
  parseFilters,
  serializeFilters,
  toggleValue,
  type CatalogFilters,
} from "@/lib/catalogFilters";

const imported: Car = {
  id: "cc-1", brand: "KIA", model: "Sorento", brandCode: "kia", modelCode: "sorento",
  price: 4_000_000, year: 2023, image: "", bodyType: "Внедорожник", engine: "бензин",
  fuel: "бензин", transmission: "автомат", drive: "4WD", mileage: 45_000,
  colorHex: "#FFFFFF", condition: "used", country: "Южная Корея",
  countryCode: "yuznaya-koreya", deliveryTime: 45, source: "carclick",
  options: [81, 50],
};

const own: Car = {
  id: "own-1", brand: "LADA", model: "Niva", price: 815_000, year: 2021,
  image: "", bodyType: "Внедорожник", engine: "",
  // Свои машины ведутся вручную и другим словарём.
  fuel: "Бензин", transmission: "Механика", drive: "Полный", mileage: 45_000,
};

const withFilters = (patch: Partial<CatalogFilters>): CatalogFilters => ({ ...emptyFilters, ...patch });

describe("разбор и сборка URL", () => {
  it("переживает круг: строка → фильтры → строка", () => {
    const source = "country=kitai,es-evropa&brand=kia&price=3500000-5000000&opt=50,81";
    const parsed = parseFilters(new URLSearchParams(source));

    expect(parsed.country).toEqual(["kitai", "es-evropa"]);
    expect(parsed.brand).toEqual(["kia"]);
    expect(parsed.price).toEqual({ from: 3_500_000, to: 5_000_000 });
    expect(parsed.opt).toEqual([50, 81]);

    const rebuilt = serializeFilters(parsed);
    expect(rebuilt.get("country")).toBe("kitai,es-evropa");
    expect(rebuilt.get("price")).toBe("3500000-5000000");
    expect(rebuilt.get("opt")).toBe("50,81");
  });

  it("понимает открытый верхний край диапазона: «от 12 млн»", () => {
    const parsed = parseFilters(new URLSearchParams("price=12000000-"));

    expect(parsed.price).toEqual({ from: 12_000_000, to: null });
    expect(serializeFilters(parsed).get("price")).toBe("12000000-");
  });

  it("пустые фильтры не оставляют мусора в адресе", () => {
    expect(serializeFilters(emptyFilters).toString()).toBe("");
    expect(countActive(emptyFilters)).toBe(0);
  });

  it("считает выбранные значения для счётчика «Сбросить»", () => {
    const filters = withFilters({ country: ["kitai"], brand: ["kia", "bmw"], price: { from: 0, to: 1 }, opt: [50] });
    expect(countActive(filters)).toBe(5);
  });
});

describe("отбор машин", () => {
  it("пустой фильтр означает «любое», а не «ничего»", () => {
    expect(matchesFilters(imported, emptyFilters)).toBe(true);
    expect(matchesFilters(own, emptyFilters)).toBe(true);
  });

  it("сводит разные словари источников к одному значению", () => {
    // «Полный» у своих и «4WD» у CarClick — это один и тот же фильтр.
    const byDrive = withFilters({ drive: ["4WD"] });
    expect(matchesFilters(imported, byDrive)).toBe(true);
    expect(matchesFilters(own, byDrive)).toBe(true);

    // Регистр топлива тоже не должен разделять выдачу.
    const byFuel = withFilters({ fuel: ["бензин"] });
    expect(matchesFilters(imported, byFuel)).toBe(true);
    expect(matchesFilters(own, byFuel)).toBe(true);
  });

  it("считает передний и задний привод за 2WD", () => {
    const rear: Car = { ...own, drive: "Задний" };
    expect(matchesFilters(rear, withFilters({ drive: ["2WD"] }))).toBe(true);
    expect(matchesFilters(rear, withFilters({ drive: ["4WD"] }))).toBe(false);
  });

  it("делит каталог на наличие и заказ", () => {
    expect(matchesFilters(own, withFilters({ avail: ["instock"] }))).toBe(true);
    expect(matchesFilters(imported, withFilters({ avail: ["instock"] }))).toBe(false);
    expect(matchesFilters(imported, withFilters({ avail: ["order"] }))).toBe(true);
  });

  it("берёт диапазон включительно снизу и исключительно сверху", () => {
    // Иначе машина за 5 000 000 попала бы сразу в два соседних интервала.
    expect(matchesFilters(imported, withFilters({ price: { from: 3_500_000, to: 5_000_000 } }))).toBe(true);
    expect(matchesFilters(imported, withFilters({ price: { from: 4_000_000, to: null } }))).toBe(true);
    expect(matchesFilters(imported, withFilters({ price: { from: 0, to: 4_000_000 } }))).toBe(false);
  });

  it("не показывает машину без данных, если по этому полю фильтруют", () => {
    // У своей машины нет страны — по фильтру стран её показывать нельзя.
    expect(matchesFilters(own, withFilters({ country: ["yuznaya-koreya"] }))).toBe(false);
  });

  it("требует все выбранные опции сразу, а не любую из них", () => {
    expect(matchesFilters(imported, withFilters({ opt: [81] }))).toBe(true);
    expect(matchesFilters(imported, withFilters({ opt: [81, 50] }))).toBe(true);
    expect(matchesFilters(imported, withFilters({ opt: [81, 999] }))).toBe(false);
    expect(matchesFilters(own, withFilters({ opt: [81] }))).toBe(false);
  });

  it("складывает разные фильтры по «И»", () => {
    const narrow = withFilters({ brand: ["kia"], body: ["Внедорожник"], transmission: ["автомат"] });
    expect(matchesFilters(imported, narrow)).toBe(true);
    expect(matchesFilters({ ...imported, transmission: "механика" }, narrow)).toBe(false);
  });
});

describe("переключение значений", () => {
  it("добавляет и убирает значение", () => {
    expect(toggleValue([], "kia")).toEqual(["kia"]);
    expect(toggleValue(["kia", "bmw"], "kia")).toEqual(["bmw"]);
  });
});
