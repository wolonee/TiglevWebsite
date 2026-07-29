import type { CarImage } from "./carImages";
import type { Car } from "./cars";

export function getCarGallery(car: Car): CarImage[] {
  if (car.images?.length) return car.images;
  return [{ url: car.image, position: { x: 50, y: 50 } }];
}
