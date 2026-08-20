import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LeadDialog from "@/components/LeadDialog";
import type { Car } from "@/data/cars";

const CAR: Car = {
  id: "cc-465823",
  source: "carclick",
  brand: "BMW",
  model: "5 Series",
  year: 2022,
  price: 5_115_817,
  image: "",
  bodyType: "Седан",
  engine: "бензин",
  country: "Китай",
  deliveryTime: 45,
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TELEGRAM_USERNAME", "");
  vi.stubEnv("NEXT_PUBLIC_MAX_USERNAME", "");
  vi.stubEnv("NEXT_PUBLIC_VK_USERNAME", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("LeadDialog", () => {
  it("отправляет заявку вместе с автомобилем, а не только с контактами", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<LeadDialog car={CAR} open onOpenChange={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Иван"), "Пётр");
    await user.type(screen.getByPlaceholderText("+7 (___) ___-__-__"), "+79991234567");
    await user.click(screen.getByRole("button", { name: "Отправить заявку" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact-requests");
    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload).toMatchObject({
      name: "Пётр",
      phone: "+79991234567",
      carTitle: "BMW 5 Series, 2022",
    });
    expect(payload.carUrl).toContain("http");
    expect(await screen.findByText("Заявка отправлена")).toBeInTheDocument();
  });

  it("не даёт отправить форму без имени и телефона", () => {
    render(<LeadDialog car={CAR} open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Отправить заявку" })).toBeDisabled();
  });

  it("сообщает об ошибке и оставляет форму заполненной, чтобы не набирать номер заново", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));

    render(<LeadDialog car={CAR} open onOpenChange={vi.fn()} />);
    await user.type(screen.getByPlaceholderText("Иван"), "Пётр");
    await user.type(screen.getByPlaceholderText("+7 (___) ___-__-__"), "+79991234567");
    await user.click(screen.getByRole("button", { name: "Отправить заявку" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось отправить заявку");
    expect(screen.getByPlaceholderText("+7 (___) ___-__-__")).toHaveValue("+79991234567");
  });

  it("не предлагает мессенджеры: человек уже выбрал «оставить номер»", () => {
    render(<LeadDialog car={CAR} open onOpenChange={vi.fn()} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
