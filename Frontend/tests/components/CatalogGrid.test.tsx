import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CatalogGrid from "@/components/CatalogGrid";
import type { Car } from "@/data/cars";
import { emptyFilters, parseFilters, type CatalogFilters } from "@/lib/catalogFilters";

vi.mock("@/components/CarCard", () => ({
  default: ({ car }: { car: Car }) => <article>{car.brand} {car.model}</article>,
}));

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const own: Car = {
  id: "own-1", brand: "KIA", model: "Sorento", price: 2_850_000, year: 2017,
  image: "/car.webp", bodyType: "Кроссовер", engine: "Бензин", source: "own",
};

const imported: Car = {
  id: "cc-1", brand: "BMW", model: "X5", price: 8_000_000, year: 2023,
  image: "/bmw.webp", bodyType: "Внедорожник", engine: "бензин",
  brandCode: "bmw", countryCode: "yuznaya-koreya", country: "Южная Корея",
  source: "carclick",
};

const renderGrid = (filters: CatalogFilters = emptyFilters, cursor: number | null = null) =>
  render(
    <CatalogGrid
      initialCars={[own, imported]}
      initialCursor={cursor}
      total={83_402}
      initialFilters={filters}
    />,
  );

/** «Наличие» — сегментированный переключатель. */
const clickAvailability = (label: string) => {
  act(() => { fireEvent.click(screen.getByRole("radio", { name: label })); });
};

/** Селект свой, не системный: открыть поле и выбрать вариант из списка. */
const chooseInSelect = (fieldLabel: string, optionLabel: RegExp) => {
  act(() => { fireEvent.click(screen.getByRole("combobox", { name: fieldLabel })); });
  act(() => { fireEvent.click(screen.getByRole("option", { name: optionLabel })); });
};

describe("CatalogGrid", () => {
  beforeEach(() => {
    replace.mockClear();
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("показывает присланные сервером карточки и общий счётчик", () => {
    const { container } = renderGrid();

    expect(screen.getByText("KIA Sorento")).toBeInTheDocument();
    expect(screen.getByText("BMW X5")).toBeInTheDocument();
    expect(screen.getByText(/83.402 автомобиля/)).toBeInTheDocument();
    expect(container.querySelector(".catalog-results > div")).toHaveClass(
      "grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3",
    );
  });

  it("держит форму поиска над каталогом, а не сбоку", () => {
    const { container } = renderGrid();

    const panel = container.querySelector(".catalog-results")?.previousElementSibling;
    expect(panel?.querySelector('[role="combobox"]')).not.toBeNull();
    expect(container.querySelector("aside")).toBeNull();
    expect(screen.getByLabelText("Цена от")).toBeInTheDocument();
  });

  it("раскрывает остальные параметры в самой панели, без окна поверх страницы", () => {
    renderGrid();

    const toggle = screen.getByRole("button", { name: /Все параметры/ });
    expect(screen.queryByText("Пробег")).not.toBeInTheDocument();

    act(() => { fireEvent.click(toggle); });

    expect(screen.getByText("Пробег")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Никакого модального слоя: прокрутка страницы не блокируется.
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("уводит смену фильтра в адрес, чтобы выдачу пересобрал сервер", () => {
    renderGrid();

    clickAvailability("В наличии");

    expect(replace).toHaveBeenCalledTimes(1);
    const [url, options] = replace.mock.calls[0];
    expect(url).toBe("/?avail=instock#catalog");
    // Без этого страница прыгала бы наверх при каждом клике по фильтру.
    expect(options).toMatchObject({ scroll: false });
  });

  it("собирает адрес из выбранной марки", () => {
    renderGrid();

    chooseInSelect("Марка", /^BMW/);

    expect(replace).toHaveBeenCalledWith("/?brand=bmw#catalog", { scroll: false });
  });

  it("восстанавливает состояние панели из фильтров, пришедших с сервера", () => {
    renderGrid(parseFilters(new URLSearchParams("brand=bmw&avail=order")));

    expect(screen.getByRole("combobox", { name: "Марка" })).toHaveValue("BMW");
    expect(screen.getByRole("radio", { name: "Под заказ" })).toHaveAttribute("aria-checked", "true");
  });

  it("предлагает сбросить фильтры, когда ничего не найдено", () => {
    render(
      <CatalogGrid
        initialCars={[]}
        initialCursor={null}
        total={0}
        initialFilters={parseFilters(new URLSearchParams("brand=lada"))}
      />,
    );

    expect(screen.getByText("Автомобили не найдены")).toBeInTheDocument();

    act(() => { fireEvent.click(screen.getByRole("button", { name: "Сбросить фильтры" })); });

    expect(replace).toHaveBeenCalledWith("/#catalog", { scroll: false });
  });

  it("догружает следующую страницу по курсору, а не по смещению", async () => {
    const next: Car = { ...imported, id: "cc-2", model: "X3" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cars: [next], nextCursor: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    let trigger: (() => void) | undefined;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        trigger = () => callback([{ isIntersecting: true }]);
      }
      observe() {}
      disconnect() {}
    });

    renderGrid(emptyFilters, 465_800);
    await act(async () => { trigger?.(); });

    expect(fetchMock).toHaveBeenCalledWith("/api/catalog?cursor=465800");
    expect(screen.getByText("BMW X3")).toBeInTheDocument();
  });
});
