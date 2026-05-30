export type MediaConverterOutputFormat = "JPG" | "PNG" | "WebP";

export type MediaConverterMimeType = "image/jpeg" | "image/png" | "image/webp";

export type MediaConverterConvertOptions = {
  outputFormat: MediaConverterOutputFormat;
  quality: number;
  backgroundColor?: string;
  maxWidth?: number;
  maxHeight?: number;
};

export type MediaConverterConvertResult = {
  blob: Blob;
  mimeType: MediaConverterMimeType;
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
  usedFallback: boolean;
};
