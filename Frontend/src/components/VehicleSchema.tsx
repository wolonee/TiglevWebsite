import type { Car } from "@/data/cars";
import { OWN_SOURCE } from "@/data/catalogSource";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Разметка Schema.org для карточки автомобиля.
 *
 * Даёт расширенный вид в выдаче: цена и характеристики показываются прямо
 * в результатах поиска, а не только заголовок со ссылкой.
 *
 * Пишем только то, что действительно знаем. Пустые и придуманные поля здесь
 * опаснее отсутствующих: за разметку, не совпадающую с содержимым страницы,
 * поисковики снимают расширенный вид целиком.
 */

/** Тип топлива у Schema.org свободный, но лучше давать понятные значения. */
const FUEL_LABELS: Record<string, string> = {
  бензин: "Gasoline",
  дизель: "Diesel",
  электро: "Electric",
  гибрид: "Hybrid",
};

const skipEmpty = <T extends Record<string, unknown>>(source: T) =>
  Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined && value !== ""));

export default function VehicleSchema({ car }: { car: Car }) {
  const isOwn = (car.source ?? OWN_SOURCE) === OWN_SOURCE;
  const name = [car.brand, car.model, car.year || null].filter(Boolean).join(" ");

  const schema = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    ...skipEmpty({
      name,
      brand: car.brand ? { "@type": "Brand", name: car.brand } : undefined,
      model: car.model || undefined,
      vehicleModelDate: car.year ? String(car.year) : undefined,
      bodyType: car.bodyType && car.bodyType.toLowerCase() !== "другое" ? car.bodyType : undefined,
      color: car.color || undefined,
      image: car.image || undefined,
      description: car.description || undefined,
      vehicleTransmission: car.transmission || undefined,
      driveWheelConfiguration: car.drive || undefined,
      fuelType: car.fuel ? FUEL_LABELS[car.fuel.toLowerCase()] ?? car.fuel : undefined,
      // Пробег даём вместе с единицей: без неё «65000» читается как угодно.
      mileageFromOdometer:
        car.mileage == null ? undefined : { "@type": "QuantitativeValue", value: car.mileage, unitCode: "KMT" },
      vehicleEngine: car.power
        ? {
            "@type": "EngineSpecification",
            enginePower: { "@type": "QuantitativeValue", value: Number(car.power) || undefined, unitCode: "N12" },
          }
        : undefined,
      itemCondition:
        car.condition === "new"
          ? "https://schema.org/NewCondition"
          : car.condition === "used"
            ? "https://schema.org/UsedCondition"
            : undefined,
    }),
    offers: skipEmpty({
      "@type": "Offer",
      price: car.price,
      priceCurrency: "RUB",
      url: `${SITE_URL}/catalog/${car.id}`,
      // Своя машина стоит в Тольятти, импортная едет под заказ — для покупателя
      // это разные предложения, и поисковик показывает их по-разному.
      availability: isOwn ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      seller: { "@type": "AutoDealer", name: SITE_NAME, url: SITE_URL },
      ...(isOwn || !car.deliveryTime
        ? {}
        : {
            deliveryLeadTime: {
              "@type": "QuantitativeValue",
              value: car.deliveryTime,
              unitCode: "DAY",
            },
          }),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}

/**
 * JSON для тега `<script>`.
 *
 * Внутри `<script>` браузер ищет закрывающий тег раньше, чем разбирает JSON:
 * строка `</script>` в описании лота оборвала бы тег и всё, что за ней, ушло бы
 * в разметку страницы. Описания приходят из чужого API, так что это не теория.
 * Экранируем `<` — в JSON `<` равнозначен исходному символу.
 */
const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
