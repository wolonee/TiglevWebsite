export type Car = {
  id: string;
  brand: string;
  model: string;
  price: number;
  year: number;
  image: string;
  images?: string[];
  bodyType: string;
  engine: string;
  description?: string;
  engineVolume?: string;
  power?: string;
  transmission?: string;
  mileage?: number;
  drive?: string;
  wheel?: string;
  color?: string;
  damage?: string;
};

export const cars: Car[] = [
  {
    id: "151698",
    brand: "KIA",
    model: "Sportage",
    price: 3750000,
    year: 2023,
    image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=600&h=400&fit=crop",
    bodyType: "Кроссовер",
    engine: "Бензин",
  },
  {
    id: "151704",
    brand: "KIA",
    model: "Sorento",
    price: 3850000,
    year: 2023,
    image: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=400&fit=crop",
    bodyType: "Внедорожник",
    engine: "Бензин",
  },
  {
    id: "151709",
    brand: "KIA",
    model: "K5",
    price: 4195000,
    year: 2023,
    image: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600&h=400&fit=crop",
    bodyType: "Седан",
    engine: "Бензин",
  },
  {
    id: "151710",
    brand: "KIA",
    model: "Sorento",
    price: 4190000,
    year: 2023,
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop",
    bodyType: "Кроссовер",
    engine: "Бензин",
  },
  {
    id: "151716",
    brand: "KIA",
    model: "Sorento",
    price: 4950000,
    year: 2023,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop",
    bodyType: "Кроссовер",
    engine: "Бензин",
    description: "Абсолютно новый автомобиль, вы будете первым владельцем.",
  },
  {
    id: "151723",
    brand: "LADA",
    model: "Granta",
    price: 390000,
    year: 2012,
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=400&fit=crop",
    bodyType: "Седан",
    engine: "Бензин",
  },
  {
    id: "151727",
    brand: "LADA",
    model: "Granta",
    price: 1010000,
    year: 2023,
    image: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&h=400&fit=crop",
    bodyType: "Седан",
    engine: "Бензин",
  },
  {
    id: "151743",
    brand: "LADA",
    model: "Нива Тревел",
    price: 850000,
    year: 2021,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=400&fit=crop",
    bodyType: "Внедорожник",
    engine: "Бензин",
  },
  {
    id: "151740",
    brand: "Land Rover",
    model: "Discovery",
    price: 1550000,
    year: 2011,
    image: "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=600&h=400&fit=crop",
    bodyType: "Внедорожник",
    engine: "Дизель",
  },
  {
    id: "151734",
    brand: "KIA",
    model: "Sorento",
    price: 5490000,
    year: 2024,
    image: "https://images.unsplash.com/photo-1542362567-b07e54358753?w=600&h=400&fit=crop",
    bodyType: "Внедорожник",
    engine: "Бензин",
    description: "Новый автомобиль KIA Sorento 2024, 2.5 АКПП, бензин.",
  },
  {
    id: "151721",
    brand: "KIA",
    model: "Ceed",
    price: 2770000,
    year: 2023,
    image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop",
    bodyType: "Хэтчбэк",
    engine: "Бензин",
  },
  {
    id: "151800",
    brand: "BMW",
    model: "3 Series",
    price: 4200000,
    year: 2022,
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop",
    bodyType: "Седан",
    engine: "Бензин",
  },
];

const detailDefaults = [
  ["2000 см³", "150 л.с.", "Автомат", 18000, "Полный", "Белый"],
  ["2200 см³", "200 л.с.", "Автомат", 12000, "Полный", "Серый"],
  ["2500 см³", "180 л.с.", "Автомат", 22000, "Передний", "Чёрный"],
] as const;

cars.forEach((car, index) => {
  const details = detailDefaults[index % detailDefaults.length];
  car.engineVolume ??= details[0]; car.power ??= details[1]; car.transmission ??= details[2];
  car.mileage ??= details[3]; car.drive ??= details[4]; car.color ??= details[5];
  car.wheel ??= "Левый, ГУР"; car.damage ??= "Нет";
});

export const brands = [
  "Abarth", "Acura", "Alfa Romeo", "Audi", "BAIC", "Bentley", "BMW", "Brilliance", "Buick", "BYD",
  "Cadillac", "Changan", "Chery", "CHEVROLET", "Chrysler", "Citroën", "Dacia", "Daewoo", "Daihatsu", "Dodge",
  "Dongfeng", "EXEED", "FAW", "Ferrari", "Fiat", "Ford", "GAC", "Geely", "Genesis", "GMC", "Great Wall",
  "Haval", "HONDA", "Hongqi", "HYUNDAI", "Infiniti", "Isuzu", "JAC", "Jaguar", "Jeep", "Jetour", "KAIYI",
  "KIA", "LADA", "Lamborghini", "Land Rover", "LEXUS", "Li Auto", "Lincoln", "Lotus", "Maserati", "MAZDA",
  "MERCEDES", "MINI", "MITSUBISHI", "Moskvich", "NISSAN", "Omoda", "OPEL", "Peugeot", "Porsche", "RAM",
  "Ravon", "RENAULT", "Rolls-Royce", "SEAT", "SKODA", "Smart", "SUBARU", "SUZUKI", "Tank", "Tesla", "TOYOTA",
  "UAZ", "VOLKSWAGEN", "VOLVO", "Voyah", "Zeekr",
];

export const bodyTypes = [
  "Внедорожник", "Кабриолет", "Компактвэн", "Кроссовер", "Купе", "Лифтбэк", "Минивэн",
  "Микроавтобус", "Пикап", "Родстер", "Седан", "Тарга", "Универсал", "Фургон", "Хэтчбэк",
];

export const engineTypes = ["Бензин", "Дизель", "Газ", "Газ/бензин", "Гибрид", "Электро"];
export const transmissions = ["Автомат", "Вариатор", "Механика", "Робот"];
export const driveTypes = ["Передний", "Задний", "Полный"];
export const wheelPositions = ["Левый", "Правый"];
export const colors = ["Бежевый", "Белый", "Бирюзовый", "Бордовый", "Бронзовый", "Голубой", "Жёлтый", "Зелёный", "Золотой", "Коричневый", "Красный", "Оранжевый", "Розовый", "Серебристый", "Серый", "Синий", "Фиолетовый", "Чёрный"];
export const damageOptions = ["Нет", "Есть", "Восстановлен"];

export const formatPrice = (price: number): string => {
  return price.toLocaleString("ru-RU") + " \u20BD";
};

export async function getCatalogCars(): Promise<Car[]> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) return cars;
  try {
    const response = await fetch(`${backendUrl}/api/cars`, { cache: "no-store" });
    if (!response.ok) return cars;
    const payload = await response.json() as { cars?: Array<Omit<Car, "image"> & { images: string[] }> };
    const stored = (payload.cars ?? []).map((car) => ({ ...car, image: car.images[0] }));
    return stored;
  } catch {
    return cars;
  }
}

export async function getCar(id: string): Promise<Car | undefined> {
  const local = cars.find((car) => car.id === id);
  if (local) return local;
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) return undefined;
  try {
    const response = await fetch(`${backendUrl}/api/cars/${id}`, { cache: "no-store" });
    if (!response.ok) return undefined;
    const { car } = await response.json() as { car: Omit<Car, "image"> & { images: string[] } };
    return { ...car, image: car.images[0] };
  } catch {
    return undefined;
  }
}
