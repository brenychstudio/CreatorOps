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

export type MediaConverterZipFile = {
  path: string;
  blob: Blob;
};

export type MediaConverterManifestFile = {
  originalName: string;
  convertedName: string;
  originalFormat: string;
  outputFormat: string;
  originalSize: number;
  convertedSize: number;
  width?: number;
  height?: number;
  preset: string;
  usedFallback: boolean;
};

export type MediaConverterManifest = {
  tool: "CreatorOps Media Converter";
  version: "v1-local";
  createdAt: string;
  localFirst: true;
  files: MediaConverterManifestFile[];
};
