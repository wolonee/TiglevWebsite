import { describe, expect, it, vi } from "vitest";
import type { Car } from "@/data/cars";

// Страницы каталога тянут за собой `server-only`, который вне сервера бросает
// исключение, и подключение к Postgres, которого в тестах нет. Метаданные ни от
// того, ни от другого не зависят.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ sql: { query: vi.fn().mockResolvedValue([]) } }));

/**
 * Заголовки и canonical у каталога и карточки автомобиля.
 *
 * Проверяем не текст, а два свойства, ради которых это делалось: страница
 * перестала быть безымянной, и любой набор фильтров сводится к одному адресу.
 */

const IMPORTED: Car = {
  id: "cc-465823",
  source: "carclick",
  brand: "BMW",
  model: "5 Series",
  year: 2022,
  price: 5_115_817,
  mileage: 65_000,
  image: "https://s3-api.carclick.ru/cover.webp",
  bodyType: "Седан",
  engine: "бензин",
  fuel: "бензин",
  power: "252",
  engineVolume: "2.0 л",
  transmission: "автомат",
  drive: "2WD",
  country: "Китай",
  deliveryTime: 45,
  condition: "used",
};

const OWN: Car = {
  id: "kia-sorento-2017",
  source: "own",
  brand: "KIA",
  model: "Sorento",
  year: 2017,
  price: 2_850_000,
  image: "/images/catalog-hq/kia-sorento-2017/01.webp",
  bodyType: "Кроссовер",
  engine: "Бензин",
  transmission: "Автомат",
};

const mockLot = (car: Car | undefined) => {
  vi.doMock("@/data/catalogRepo", () => ({
    fetchLot: vi.fn().mockResolvedValue(car ? { car, options: [] } : null),
    fetchCatalogPage: vi.fn(),
    countCatalog: vi.fn(),
    PAGE_SIZE: 24,
  }));
  vi.doMock("@/data/cars", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/data/cars")>()),
    getCar: vi.fn().mockResolvedValue(car),
    getCatalogCars: vi.fn().mockResolvedValue([]),
  }));
};

const lotMetadata = async (id: string) => {
  const { generateMetadata } = await import("@/app/catalog/[id]/page");
  return generateMetadata({ params: Promise.resolve({ id }) });
};

describe("метаданные каталога", () => {
  it("каталог сводит любые фильтры к одному адресу", async () => {
    vi.resetModules();
    const { metadata } = await import("@/app/page");

    expect(metadata.alternates?.canonical).toBe("/");
    expect(String(metadata.title)).toContain("Каталог");
    expect(String(metadata.description)).toMatch(/автомобилей под заказ/);
  });

  it("карточка импортной машины называет модель, страну и цену", async () => {
    vi.resetModules();
    mockLot(IMPORTED);

    const meta = await lotMetadata("cc-465823");

    expect(String(meta.title)).toContain("BMW 5 Series 2022");
    expect(String(meta.title)).toContain("из Китая");
    expect(meta.alternates?.canonical).toBe("/catalog/cc-465823");
    // Через toLocaleString: разделитель разрядов там неразрывный пробел.
    expect(String(meta.description)).toContain(`${(65_000).toLocaleString("ru-RU")} км`);
    expect(String(meta.description)).toContain("Доставка 45 дней");
  });

  it("своя машина продаётся из наличия, а не под заказ", async () => {
    vi.resetModules();
    mockLot(OWN);

    const meta = await lotMetadata("kia-sorento-2017");

    expect(String(meta.title)).toContain("в наличии в Тольятти");
    expect(String(meta.title)).not.toContain("под заказ");
    expect(meta.alternates?.canonical).toBe("/catalog/kia-sorento-2017");
  });

  it("несуществующий лот не роняет генерацию заголовка", async () => {
    vi.resetModules();
    mockLot(undefined);

    expect(String((await lotMetadata("cc-1")).title)).toContain("не найден");
  });
});
