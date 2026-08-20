import { act, createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import CarCard from "@/components/CarCard";
import type { Car } from "@/data/cars";

vi.mock("next/image", () => ({
  default: ({ fill, priority, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    void fill; void priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

const car: Car = {
  id: "car-1", brand: "BMW", model: "X5", price: 5000000, year: 2024,
  image: "https://images.unsplash.com/cover.jpg",
  images: [
    { url: "https://images.unsplash.com/cover.jpg", position: { x: 50, y: 50 } },
    { url: "https://images.unsplash.com/inside.jpg", position: { x: 50, y: 50 } },
    { url: "https://images.unsplash.com/back.jpg", position: { x: 50, y: 50 } },
  ],
  bodyType: "Кроссовер",
  engine: "",
  mileage: 28667,
  fuel: "Бензин",
  power: "258",
  engineVolume: "3.0",
  transmission: "Автомат",
  drive: "Полный",
  country: "Южная Корея",
  deliveryTime: 45,
  condition: "used",
  source: "carclick",
};

describe("CarCard", () => {
  it("renders the six CarClick specs with formatted units", () => {
    render(<CarCard car={car} />);

    for (const label of ["Пробег", "Двигатель", "Мощность", "Объём", "Коробка", "Привод"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText(/28[\s  ]667 км/)).toBeInTheDocument();
    expect(screen.getByText("Бензин")).toBeInTheDocument();
    expect(screen.getByText("258 л.с.")).toBeInTheDocument();
    expect(screen.getByText("3.0 л")).toBeInTheDocument();
    expect(screen.getByText("Автомат")).toBeInTheDocument();
    expect(screen.getByText("Полный")).toBeInTheDocument();
  });

  it("does not append a unit when the value already carries one", () => {
    render(<CarCard car={{ ...car, power: "184 л.с.", engineVolume: "2.0 л" }} />);

    expect(screen.getByText("184 л.с.")).toBeInTheDocument();
    expect(screen.getByText("2.0 л")).toBeInTheDocument();
  });

  it("omits spec cells that have no data", () => {
    render(<CarCard car={{ ...car, fuel: undefined, drive: undefined, power: undefined }} />);

    expect(screen.getByText("Пробег")).toBeInTheDocument();
    expect(screen.queryByText("Двигатель")).not.toBeInTheDocument();
    expect(screen.queryByText("Привод")).not.toBeInTheDocument();
    expect(screen.queryByText("Мощность")).not.toBeInTheDocument();
  });

  it("shows country, delivery and photo count, links to the lot", () => {
    render(<CarCard car={car} />);

    expect(screen.getByText("Южная Корея")).toBeInTheDocument();
    expect(screen.getByText("под ключ · доставка 45 дн")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument(); // позиция в галерее

    const link = screen.getByRole("link", { name: /Подробнее о BMW X5/ });
    expect(link).toHaveAttribute("href", "/catalog/car-1");
    expect(within(link).getByText("BMW X5")).toBeInTheDocument();
    expect(within(link).getByText("2024 г. · Кроссовер")).toBeInTheDocument();
  });

  it("marks new cars and omits the badge for used ones", () => {
    const { rerender } = render(<CarCard car={{ ...car, condition: "new" }} />);
    expect(screen.getByText("Новый")).toBeInTheDocument();

    rerender(<CarCard car={{ ...car, condition: "used" }} />);
    expect(screen.queryByText("Новый")).not.toBeInTheDocument();
  });

  it("falls back to 'под ключ' when no delivery time is set", () => {
    render(<CarCard car={{ ...car, deliveryTime: undefined }} />);

    expect(screen.getByText("под ключ")).toBeInTheDocument();
    expect(screen.queryByText(/доставка/)).not.toBeInTheDocument();
  });

  it("uses the stored focal point for the catalog cover", () => {
    render(<CarCard car={{ ...car, images: [{ ...car.images![0], position: { x: 20, y: 80 } }] }} />);

    expect(screen.getByAltText("BMW X5 2024")).toHaveStyle({ objectPosition: "20% 80%" });
  });

  it("marks own cars as available locally instead of showing a country", () => {
    render(<CarCard car={{ ...car, source: "own", country: undefined }} />);

    expect(screen.getByText("В наличии в Тольятти")).toBeInTheDocument();
    expect(screen.queryByText("Южная Корея")).not.toBeInTheDocument();
  });

  it("normalizes vocabulary differences between the two sources", () => {
    // Свои машины пишут «Полный» и «Бензин», CarClick — «4WD» и «бензин».
    render(<CarCard car={{ ...car, source: "own", fuel: "бензин", drive: "Полный", transmission: "автомат" }} />);

    expect(screen.getByText("Бензин")).toBeInTheDocument();
    expect(screen.getByText("Полный")).toBeInTheDocument();
    expect(screen.getByText("Автомат")).toBeInTheDocument();
  });

  it("листает галерею стрелками, не уходя на страницу лота", () => {
    render(<CarCard car={car} />);

    expect(screen.getByAltText("BMW X5 2024")).toHaveAttribute("src", expect.stringContaining("cover.jpg"));

    const next = screen.getByRole("button", { name: /Следующее фото/ });
    const click = createEvent.click(next);
    fireEvent(next, click);

    // Кнопка живёт внутри ссылки: без этого клик уводил бы на страницу лота.
    expect(click.defaultPrevented).toBe(true);
    expect(screen.getByAltText("BMW X5 2024")).toHaveAttribute("src", expect.stringContaining("inside.jpg"));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("перематывает с первого кадра на последний", () => {
    render(<CarCard car={car} />);

    fireEvent.click(screen.getByRole("button", { name: /Предыдущее фото/ }));

    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("не показывает стрелки, когда фото одно", () => {
    render(<CarCard car={{ ...car, images: [car.images![0]] }} />);

    expect(screen.queryByRole("button", { name: /фото/ })).not.toBeInTheDocument();
  });

  it("drops the placeholder body type 'другое' from the subtitle", () => {
    render(<CarCard car={{ ...car, bodyType: "другое" }} />);

    expect(screen.getByText("2024 г.")).toBeInTheDocument();
  });

  /**
   * Фотография уехавшей карточки должна освобождаться: каждая занимает
   * 1024 × 768 × 4 = 3 МБ распакованного растра, и в бесконечной ленте
   * несколько сотен карточек набирают гигабайт.
   */
  it("отдаёт фотографию, когда карточка ушла далеко от экрана, и сохраняет высоту", () => {
    // Наблюдателей за жизнь компонента создаётся несколько (эффект
    // перезапускается), поэтому дёргаем все, а не только последний.
    const observers: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          observers.push(callback);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const report = (isIntersecting: boolean) =>
      act(() => observers.forEach((notify) => notify([{ isIntersecting }])));

    const { container } = render(<CarCard car={car} />);
    const frame = container.querySelector(".aspect-\\[16\\/10\\]");
    expect(container.querySelectorAll("img")).toHaveLength(1);

    report(false);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    // Рамка на месте — значит прокрутка не прыгнет.
    expect(frame).toBeInTheDocument();

    report(true);
    expect(container.querySelectorAll("img")).toHaveLength(1);

    vi.unstubAllGlobals();
  });
});
