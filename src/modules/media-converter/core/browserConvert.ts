import type {
  MediaConverterConvertOptions,
  MediaConverterConvertResult,
  MediaConverterMimeType,
  MediaConverterOutputFormat,
} from "./types";

export function outputFormatToMimeType(format: MediaConverterOutputFormat): MediaConverterMimeType {
  if (format === "JPG") return "image/jpeg";
  if (format === "WebP") return "image/webp";
  return "image/png";
}

export function outputFormatToExtension(format: MediaConverterOutputFormat): "jpg" | "png" | "webp" {
  if (format === "JPG") return "jpg";
  if (format === "WebP") return "webp";
  return "png";
}

function mimeTypeToExtension(mimeType: MediaConverterMimeType): "jpg" | "png" | "webp" {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function resolveOutputSize(sourceWidth: number, sourceHeight: number, maxWidth?: number, maxHeight?: number) {
  if (!maxWidth && !maxHeight) return { width: sourceWidth, height: sourceHeight };

  const widthRatio = maxWidth ? maxWidth / sourceWidth : 1;
  const heightRatio = maxHeight ? maxHeight / sourceHeight : 1;
  const ratio = Math.min(1, widthRatio, heightRatio);

  return {
    width: Math.max(1, Math.round(sourceWidth * ratio)),
    height: Math.max(1, Math.round(sourceHeight * ratio)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: MediaConverterMimeType, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("encode-failed"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

export async function convertImageFile(
  file: File,
  options: MediaConverterConvertOptions,
): Promise<MediaConverterConvertResult> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("decode-failed");
  }

  try {
    const { width, height } = resolveOutputSize(bitmap.width, bitmap.height, options.maxWidth, options.maxHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-context-failed");

    const requestedMimeType = outputFormatToMimeType(options.outputFormat);
    if (options.outputFormat === "JPG") {
      context.fillStyle = options.backgroundColor ?? "#ffffff";
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, requestedMimeType, options.quality / 100);
    const resolvedMimeType = (blob.type || "image/png") as MediaConverterMimeType;
    const supportedMimeType: MediaConverterMimeType =
      resolvedMimeType === "image/jpeg" || resolvedMimeType === "image/webp" || resolvedMimeType === "image/png"
        ? resolvedMimeType
        : "image/png";
    const usedFallback = supportedMimeType !== requestedMimeType;

    return {
      blob,
      mimeType: supportedMimeType,
      extension: usedFallback ? mimeTypeToExtension(supportedMimeType) : outputFormatToExtension(options.outputFormat),
      width,
      height,
      usedFallback,
    };
  } finally {
    bitmap.close?.();
  }
}
