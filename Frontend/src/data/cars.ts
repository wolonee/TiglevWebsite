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

type CatalogCar = Omit<Car, "image" | "images" | "bodyType" | "engine"> & {
  slug: string;
  photoCount: number;
  bodyType?: string;
  engine?: string;
};

const createCatalogCar = ({ slug, photoCount, bodyType = "", engine = "", ...car }: CatalogCar): Car => {
  const images = Array.from(
    { length: photoCount },
    (_, index) => `/images/catalog-hq/${slug}/${String(index + 1).padStart(2, "0")}.webp`,
  );
  return { ...car, bodyType, engine, image: images[0], images };
};

export const cars: Car[] = [
  createCatalogCar({
    id: "kia-sorento-2017",
    slug: "kia-sorento-2017",
    brand: "KIA",
    model: "Sorento",
    price: 2850000,
    year: 2017,
    photoCount: 10,
    transmission: "Автомат",
    description: "Продается Kia Sorento, 2017 года. Автомобиль в одних руках с момента приобретения в дилерском центре. Максимальная комплектация с панорамой и акустикой «Infinity». Все ТО по регламенту на квалифицированном СТО. Дополнительно установлено механическое противоугонное устройство на АКПП. Два ключа и сервисная книжка с отметками о прохождении всех ТО. Летняя и зимняя шипованная резина в комплекте. Полное ТО с заменой масла и всех фильтров сделано 3 тыс. км назад. Полное обслуживание АКПП сделано ранее. Документы и акты о проделанных работах имеются.",
  }),
  createCatalogCar({
    id: "kia-sorento-2024",
    slug: "kia-sorento-2024",
    brand: "KIA",
    model: "Sorento",
    price: 5850000,
    year: 2024,
    photoCount: 6,
    bodyType: "Кроссовер",
    engineVolume: "2.5 л",
    description: "Представьте: вы садитесь в этот автомобиль впервые. И он полностью ваш. Не «перекупский пробег». Не «ездил кто-то до вас». А вы — первый, кто открывает дверь, чувствует запах кожи и заводит этот KIA Sorento 2024. Без пробега по РФ. Вы просто приезжаете, оформляете документы и уезжаете на своём новом кроссовере. Первым собственником. По закону. С чистой историей. Вы садитесь в мягкий кожаный салон — идеальный для утра с кофе или долгой дороги в отпуск. За спиной — простор для семьи, детей, сумок, собак и велосипедов. За городом — уверенный 2.5-литровый двигатель. Комплектация LUXE, 5 мест.",
  }),
  createCatalogCar({
    id: "lada-niva-travel-2021",
    slug: "lada-niva-travel-2021",
    brand: "LADA",
    model: "Niva Travel",
    price: 815000,
    year: 2021,
    photoCount: 10,
    description: "Один хозяин. Кондиционер. Автомобиль находится в технически исправном состоянии. Без ДТП, не крашен. Установлена магнитола.",
  }),
  createCatalogCar({
    id: "kia-cerato-2006",
    slug: "kia-cerato-2006",
    brand: "KIA",
    model: "Cerato",
    price: 400000,
    year: 2006,
    photoCount: 8,
    description: "Автомобиль полностью в рабочем состоянии. Хорошая зимняя и летняя резина. Простой, надежный и неприхотливый.",
  }),
  createCatalogCar({
    id: "mazda-3-2006",
    slug: "mazda-3-2006",
    brand: "MAZDA",
    model: "Mazda3",
    price: 750000,
    year: 2006,
    photoCount: 10,
    transmission: "Автомат",
    description: "Автомобиль в хорошем состоянии. В салоне не курили. ДВС и АКПП в рабочем состоянии. Полный капитальный ремонт двигателя. Новая цепь, ГРМ в сборе, подушки ДВС, свечи, катушки, масляный насос и датчик коленвала. Новый комплект зимней резины.",
  }),
  createCatalogCar({
    id: "datsun-on-do-2018",
    slug: "datsun-on-do-2018",
    brand: "Datsun",
    model: "on-DO",
    price: 445000,
    year: 2018,
    photoCount: 8,
    description: "Один хозяин. Автомобиль технически исправен. АБС, стеклоподъемники, подогрев передних сидений, два ключа и сигнализация StarLine. Без кондиционера.",
  }),
  createCatalogCar({
    id: "lada-vesta-cross-2024",
    slug: "lada-vesta-cross-2024",
    brand: "LADA",
    model: "Vesta Cross",
    price: 1720000,
    year: 2024,
    photoCount: 10,
    description: "Автомобиль в идеальном состоянии. Всего один владелец. Без ДТП и скрытых проблем. Официальная гарантия 2 года передаётся новому владельцу. Сервисная книжка имеется, всё обслуживание по регламенту. Полный зимний пакет: подогрев передних сидений, зеркал, руля и лобового стекла. Электрические стеклоподъёмники всех дверей. Газовые упоры капота и багажника. Сигнализация StarLine. Комплектация «Техно 24» — максимальная на момент покупки.",
  }),
  createCatalogCar({
    id: "kia-sportage-2023",
    slug: "kia-sportage-2023",
    brand: "KIA",
    model: "Sportage",
    price: 3250000,
    year: 2023,
    photoCount: 7,
    mileage: 41300,
    description: "Автомобиль 2023 года выпуска с актуальным дизайном и полным набором опций. Пробег 41 300 км. Состояние — как на фото, без ДТП и скрытых дефектов. Обслуживание вовремя, по регламенту.",
  }),
  createCatalogCar({
    id: "lada-vesta-sport-2021",
    slug: "lada-vesta-sport-2021",
    brand: "LADA",
    model: "Vesta Sport",
    price: 1230000,
    year: 2021,
    photoCount: 7,
    mileage: 70000,
    description: "Одна хозяйка. Пробег 70 000 км.",
  }),
];

export const brands = [
  "Abarth", "Acura", "Alfa Romeo", "Audi", "BAIC", "Bentley", "BMW", "Brilliance", "Buick", "BYD",
  "Cadillac", "Changan", "Chery", "CHEVROLET", "Chrysler", "Citroën", "Dacia", "Daewoo", "Daihatsu", "Datsun", "Dodge",
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
const catalogRevalidateSeconds = 15 * 60;

export const formatPrice = (price: number): string => {
  return price.toLocaleString("ru-RU") + " \u20BD";
};

export async function getCatalogCars(): Promise<Car[]> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) return cars;
  try {
    const response = await fetch(`${backendUrl}/api/cars`, {
      next: { revalidate: catalogRevalidateSeconds, tags: ["catalog"] },
    });
    if (!response.ok) return cars;
    const payload = await response.json() as { cars?: Array<Omit<Car, "image"> & { images: string[] }> };
    const stored = (payload.cars ?? []).map((car) => ({ ...car, image: car.images[0] }));
    return stored;
  } catch {
    return cars;
  }
}

export async function getCar(id: string): Promise<Car | undefined> {
  const backendUrl = process.env.BACKEND_URL;
  const local = cars.find((car) => car.id === id);
  if (!backendUrl) return local;
  try {
    const response = await fetch(`${backendUrl}/api/cars/${id}`, {
      next: { revalidate: catalogRevalidateSeconds, tags: ["catalog", `car:${id}`] },
    });
    if (!response.ok) return local;
    const { car } = await response.json() as { car: Omit<Car, "image"> & { images: string[] } };
    return { ...car, image: car.images[0] };
  } catch {
    return local;
  }
}
