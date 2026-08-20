import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VehicleSchema from "@/components/VehicleSchema";
import type { Car } from "@/data/cars";

const CAR: Car = {
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
  transmission: "автомат",
  country: "Китай",
  deliveryTime: 45,
  condition: "used",
};

const schemaOf = (car: Car) => {
  const { container } = render(<VehicleSchema car={car} />);
  return {
    raw: container.querySelector("script")!.innerHTML,
    data: JSON.parse(container.querySelector("script")!.innerHTML),
  };
};

describe("VehicleSchema", () => {
  it("описывает предложение ценой, валютой и наличием", () => {
    const { data } = schemaOf(CAR);

    expect(data["@type"]).toBe("Vehicle");
    expect(data.offers).toMatchObject({
      price: 5_115_817,
      priceCurrency: "RUB",
      // Импортная машина едет под заказ, а не лежит на складе.
      availability: "https://schema.org/PreOrder",
    });
    expect(data.mileageFromOdometer).toMatchObject({ value: 65_000, unitCode: "KMT" });
  });

  it("своя машина помечена как «в наличии»", () => {
    const { data } = schemaOf({ ...CAR, id: "kia-sorento-2017", source: "own", deliveryTime: undefined });

    expect(data.offers.availability).toBe("https://schema.org/InStock");
    expect(data.offers.deliveryLeadTime).toBeUndefined();
  });

  it("не выдумывает поля, которых нет в данных", () => {
    const { data } = schemaOf({ ...CAR, mileage: undefined, power: undefined, color: undefined });

    expect(data).not.toHaveProperty("mileageFromOdometer");
    expect(data).not.toHaveProperty("vehicleEngine");
    expect(data).not.toHaveProperty("color");
  });

  it("экранирует `<`, иначе описание из чужого API рвёт тег script", () => {
    const { raw, data } = schemaOf({ ...CAR, description: "Отличная машина </script><img onerror=alert(1)>" });

    expect(raw).not.toContain("</script>");
    // При этом сами данные не портятся — экранирование обратимо.
    expect(data.description).toContain("</script>");
  });
});
