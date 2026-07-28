export type ImagePosition = {
  x: number;
  y: number;
};

export type CarImage = {
  url: string;
  position: ImagePosition;
};

export const defaultImagePosition: ImagePosition = { x: 50, y: 50 };

const clampPosition = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, value));
};

export function normalizeCarImage(image: string | Partial<CarImage>): CarImage {
  if (typeof image === "string") return { url: image, position: { ...defaultImagePosition } };

  return {
    url: image.url ?? "",
    position: {
      x: clampPosition(image.position?.x, defaultImagePosition.x),
      y: clampPosition(image.position?.y, defaultImagePosition.y),
    },
  };
}

export function normalizeCarImages(images: Array<string | Partial<CarImage>>): CarImage[] {
  return images.map(normalizeCarImage).filter((image) => image.url.length > 0);
}

export function imageObjectPosition(image: CarImage): string {
  return `${image.position.x}% ${image.position.y}%`;
}
