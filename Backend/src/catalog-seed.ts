import type { CarRecord } from "./database.js";

const defaults = [
  { engineVolume: "2000 см³", power: "150 л.с.", transmission: "Автомат", mileage: 18000, drive: "Полный", color: "Белый" },
  { engineVolume: "2200 см³", power: "200 л.с.", transmission: "Автомат", mileage: 12000, drive: "Полный", color: "Серый" },
  { engineVolume: "2500 см³", power: "180 л.с.", transmission: "Автомат", mileage: 22000, drive: "Передний", color: "Чёрный" },
];

const seedCars = [
  ["151698", "KIA", "Sportage", 3750000, 2023, "Кроссовер", "Бензин", "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1200&h=900&fit=crop"],
  ["151704", "KIA", "Sorento", 3850000, 2023, "Внедорожник", "Бензин", "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200&h=900&fit=crop"],
  ["151709", "KIA", "K5", 4195000, 2023, "Седан", "Бензин", "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&h=900&fit=crop"],
  ["151710", "KIA", "Sorento", 4190000, 2023, "Кроссовер", "Бензин", "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&h=900&fit=crop"],
  ["151716", "KIA", "Sorento", 4950000, 2023, "Кроссовер", "Бензин", "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&h=900&fit=crop"],
  ["151723", "LADA", "Granta", 390000, 2012, "Седан", "Бензин", "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&h=900&fit=crop"],
  ["151727", "LADA", "Granta", 1010000, 2023, "Седан", "Бензин", "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=1200&h=900&fit=crop"],
  ["151743", "LADA", "Нива Тревел", 850000, 2021, "Внедорожник", "Бензин", "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&h=900&fit=crop"],
  ["151740", "Land Rover", "Discovery", 1550000, 2011, "Внедорожник", "Дизель", "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=1200&h=900&fit=crop"],
  ["151734", "KIA", "Sorento", 5490000, 2024, "Внедорожник", "Бензин", "https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&h=900&fit=crop"],
  ["151721", "KIA", "Ceed", 2770000, 2023, "Хэтчбэк", "Бензин", "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&h=900&fit=crop"],
  ["151800", "BMW", "3 Series", 4200000, 2022, "Седан", "Бензин", "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&h=900&fit=crop"],
] as const;

export const catalogSeed: CarRecord[] = seedCars.map(([id, brand, model, price, year, bodyType, engine, image], index) => ({
  id, brand, model, price, year, bodyType, engine, images: [image], wheel: "Левый", damage: "Нет", status: "active", sortOrder: index, ...defaults[index % defaults.length],
}));
