import type { Car } from "./cars";

export function getCarGallery(car: Car): string[] {
  if (car.images?.length) return car.images;
  return [car.image];
}
