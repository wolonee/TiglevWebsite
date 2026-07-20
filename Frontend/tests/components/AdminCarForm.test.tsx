import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminCarForm, { type ManagedCar } from "@/components/AdminCarForm";

vi.mock("@vercel/blob/client", () => ({ upload: vi.fn() }));

const car: ManagedCar = {
  id: "car-1",
  brand: "BMW",
  model: "X5",
  price: 5_000_000,
  year: 2024,
  images: ["https://example.com/car.jpg"],
  bodyType: "Кроссовер",
  engine: "Бензин",
  status: "active",
  sortOrder: 0,
};

describe("AdminCarForm", () => {
  it("uses action buttons instead of a status selector when creating a car", () => {
    render(<AdminCarForm />);

    expect(screen.queryByLabelText("Статус автомобиля")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Опубликовать в каталоге" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохранить как черновик" })).toBeInTheDocument();
  });

  it("keeps the status selector when editing an existing car", () => {
    render(<AdminCarForm car={car} />);

    expect(screen.getByLabelText("Статус автомобиля")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Сохранить как черновик" })).not.toBeInTheDocument();
  });
});
