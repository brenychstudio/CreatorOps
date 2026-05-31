import type { MediaConverterMimeType, MediaConverterOutputFormat } from "./types";

export type MediaConverterFormatSupport = Record<MediaConverterOutputFormat, boolean>;

const MIME_BY_FORMAT: Record<MediaConverterOutputFormat, MediaConverterMimeType> = {
  JPG: "image/jpeg",
  PNG: "image/png",
  WebP: "image/webp",
};

export async function detectCanvasFormatSupport(): Promise<MediaConverterFormatSupport> {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  const context = canvas.getContext("2d");
  if (!context) {
    return {
      JPG: false,
      PNG: false,
      WebP: false,
    };
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1, 1);

  const test = (format: MediaConverterOutputFormat) =>
    new Promise<boolean>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(Boolean(blob && blob.type === MIME_BY_FORMAT[format]));
      }, MIME_BY_FORMAT[format]);
    });

  const [jpg, png, webp] = await Promise.all([test("JPG"), test("PNG"), test("WebP")]);

  return {
    JPG: jpg,
    PNG: png,
    WebP: webp,
  };
}
