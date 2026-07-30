const MAX_IMAGE_EDGE = 3000;
const WEBP_QUALITY = 0.9;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

function webpFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${base || "car-photo"}.webp`;
}

function targetDimensions(width: number, height: number) {
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeWithImageElement(file: File): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap !== "function") return decodeWithImageElement(file);

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

function canvasToWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Браузер не смог преобразовать фотографию в WebP")),
      "image/webp",
      WEBP_QUALITY,
    );
  });
}

export async function optimizeCarImage(file: File) {
  const decoded = await decodeImage(file);
  try {
    const dimensions = targetDimensions(decoded.width, decoded.height);

    if (
      file.type === "image/webp"
      && dimensions.width === decoded.width
      && dimensions.height === decoded.height
    ) {
      return new File([file], webpFilename(file.name), {
        type: "image/webp",
        lastModified: file.lastModified,
      });
    }

    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Браузер не поддерживает обработку фотографий");

    context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);
    const blob = await canvasToWebp(canvas);
    return new File([blob], webpFilename(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    decoded.close?.();
  }
}
