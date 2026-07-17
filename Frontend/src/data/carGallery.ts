import { cars, type Car } from "./cars";

const galleryPool = [
  "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&h=900&fit=crop",
  "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1200&h=900&fit=crop",
  "https://images.unsplash.com/photo-1541443131876-44b03de101c5?w=1200&h=900&fit=crop",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&h=900&fit=crop",
  "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=1200&h=900&fit=crop",
];

export function getCarGallery(car: Car): string[] {
  if (car.images?.length) return car.images;
  const carIndex = Math.max(0, cars.findIndex((item) => item.id === car.id));
  return [car.image, ...galleryPool.map((_, index) => galleryPool[(carIndex + index) % galleryPool.length])];
}
