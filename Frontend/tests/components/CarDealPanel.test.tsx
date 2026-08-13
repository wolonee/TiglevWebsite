import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CarDealPanel from "@/components/CarDealPanel";
import type { Car } from "@/data/cars";

const IMPORTED: Car = {
  id: "cc-465823",
  source: "carclick",
  brand: "BMW",
  model: "5 Series",
  year: 2022,
  price: 5_115_817,
  mileage: 65_000,
  image: "",
  bodyType: "Седан",
  engine: "бензин",
  country: "Китай",
  deliveryTime: 45,
};

const OWN: Car = {
  id: "kia-sorento-2017",
  source: "own",
  brand: "KIA",
  model: "Sorento",
  year: 2017,
  price: 2_850_000,
  image: "",
  bodyType: "Внедорожник",
  engine: "Бензин",
};

/** Полосу с кнопкой показывает IntersectionObserver — в jsdom его нет. */
let notifyObserver: ((entries: { isIntersecting: boolean }[]) => void) | undefined;

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        notifyObserver = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  notifyObserver = undefined;
  vi.unstubAllGlobals();
});

describe("CarDealPanel", () => {
  it("говорит про доставку и страну, а характеристики оставляет странице", () => {
    render(<CarDealPanel car={IMPORTED} />);

    expect(screen.getAllByText("45 дней").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Китай").length).toBeGreaterThan(0);
    // Пробег и год живут в «Характеристиках»: в блоке про оплату они лишние.
    expect(screen.queryByText(/65 000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/2022/)).not.toBeInTheDocument();
  });

  it("несёт заголовок страницы: отдельной шапки над галереей нет", () => {
    render(<CarDealPanel car={IMPORTED} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("BMW 5 Series");
  });

  it("не показывает телефон: разговор уводим в мессенджер, а не в звонок", () => {
    render(<CarDealPanel car={IMPORTED} />);
    expect(screen.queryByText(/8 \(800\)/)).not.toBeInTheDocument();
  });

  it("ставит мессенджеры прямо под кнопкой заявки", () => {
    render(<CarDealPanel car={IMPORTED} />);
    // VK настроен по умолчанию — этот аккаунт уже опубликован на сайте.
    expect(screen.getByRole("link", { name: "Написать в VK" })).toHaveAttribute(
      "href",
      "https://vk.me/tiglev",
    );
  });

  it("не предлагает кредит: машины идут через партнёра, кредит мы не оформляем", () => {
    render(<CarDealPanel car={IMPORTED} />);
    expect(screen.queryByText(/кредит/i)).not.toBeInTheDocument();
  });

  it("показывает цену юрлица только когда источник её заполнил", () => {
    const { rerender } = render(<CarDealPanel car={IMPORTED} />);
    expect(screen.queryByText("Цена для юрлица")).not.toBeInTheDocument();

    rerender(<CarDealPanel car={IMPORTED} priceLegal={5_500_000} />);
    expect(screen.getByText("Цена для юрлица")).toBeInTheDocument();
  });

  it("для своей машины зовёт на осмотр вместо срока доставки", () => {
    render(<CarDealPanel car={OWN} />);

    expect(screen.getByText("В наличии в Тольятти")).toBeInTheDocument();
    expect(screen.getByText("Где посмотреть")).toBeInTheDocument();
    expect(screen.queryByText("Срок доставки")).not.toBeInTheDocument();
  });

  it("открывает окно заявки с названием автомобиля", async () => {
    const user = userEvent.setup();
    render(<CarDealPanel car={IMPORTED} />);

    await user.click(screen.getByRole("button", { name: "Оставить заявку" }));
    expect(screen.getByRole("dialog", { name: "Заявка на BMW 5 Series" })).toBeInTheDocument();
  });

  it("держит кнопку внизу экрана, только пока блок сделки не виден", () => {
    render(<CarDealPanel car={IMPORTED} />);

    act(() => notifyObserver?.([{ isIntersecting: true }]));
    expect(screen.getAllByRole("button", { name: "Оставить заявку" })).toHaveLength(1);

    act(() => notifyObserver?.([{ isIntersecting: false }]));
    expect(screen.getAllByRole("button", { name: "Оставить заявку" })).toHaveLength(2);
  });
});
