export type Car = {
  id: string;
  brand: string;
  model: string;
  price: number;
  year: number;
  image: string;
  bodyType: string;
  engine: string;
  elite: boolean;
  fast: boolean;
  description?: string;
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
    elite: false,
    fast: false,
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
    elite: false,
    fast: false,
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
    elite: true,
    fast: false,
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
    elite: false,
    fast: true,
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
    elite: true,
    fast: false,
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
    elite: false,
    fast: true,
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
    elite: false,
    fast: false,
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
    elite: false,
    fast: false,
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
    elite: false,
    fast: false,
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
    elite: true,
    fast: false,
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
    elite: false,
    fast: true,
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
    elite: true,
    fast: false,
  },
];

export const brands = [
  "BMW", "CHEVROLET", "HONDA", "HYUNDAI", "KIA", "LADA",
  "Land Rover", "LEXUS", "MAZDA", "MERCEDES", "MITSUBISHI",
  "NISSAN", "OPEL", "RENAULT", "SKODA", "SUBARU", "SUZUKI",
  "TOYOTA", "VOLKSWAGEN", "VOLVO",
];

export const bodyTypes = [
  "Внедорожник", "Кроссовер", "Купе", "Минивэн",
  "Пикап", "Седан", "Универсал", "Хэтчбэк",
];

export const formatPrice = (price: number): string => {
  return price.toLocaleString("ru-RU") + " \u20BD";
};
