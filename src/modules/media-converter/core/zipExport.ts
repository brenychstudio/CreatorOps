import type { MediaConverterManifest, MediaConverterZipFile } from "./types";

const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;

type PreparedZipFile = {
  pathBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  localHeaderOffset: number;
  modifiedTime: number;
  modifiedDate: number;
};

function textEncoderEncode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function uint16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, value, true);
  return bytes;
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value >>> 0, true);
  return bytes;
}

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function buildCrcTable() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}

const CRC_TABLE = buildCrcTable();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function getDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const modifiedTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const modifiedDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { modifiedTime, modifiedDate };
}

function createLocalFileHeader(file: PreparedZipFile) {
  return concatUint8Arrays([
    uint32(0x04034b50),
    uint16(20),
    uint16(UTF8_FLAG),
    uint16(STORE_METHOD),
    uint16(file.modifiedTime),
    uint16(file.modifiedDate),
    uint32(file.crc),
    uint32(file.data.length),
    uint32(file.data.length),
    uint16(file.pathBytes.length),
    uint16(0),
    file.pathBytes,
  ]);
}

function createCentralDirectoryHeader(file: PreparedZipFile) {
  return concatUint8Arrays([
    uint32(0x02014b50),
    uint16(20),
    uint16(20),
    uint16(UTF8_FLAG),
    uint16(STORE_METHOD),
    uint16(file.modifiedTime),
    uint16(file.modifiedDate),
    uint32(file.crc),
    uint32(file.data.length),
    uint32(file.data.length),
    uint16(file.pathBytes.length),
    uint16(0),
    uint16(0),
    uint16(0),
    uint16(0),
    uint32(0),
    uint32(file.localHeaderOffset),
    file.pathBytes,
  ]);
}

function createEndOfCentralDirectory(fileCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
  return concatUint8Arrays([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(fileCount),
    uint16(fileCount),
    uint32(centralDirectorySize),
    uint32(centralDirectoryOffset),
    uint16(0),
  ]);
}

export async function createMediaConverterZip(args: {
  files: MediaConverterZipFile[];
  manifest: MediaConverterManifest;
  readmeText: string;
}): Promise<Blob> {
  const manifestBlob = new Blob([JSON.stringify(args.manifest, null, 2)], { type: "application/json" });
  const readmeBlob = new Blob([args.readmeText], { type: "text/plain" });
  const zipFiles: MediaConverterZipFile[] = [
    ...args.files,
    { path: "manifest.json", blob: manifestBlob },
    { path: "README.txt", blob: readmeBlob },
  ];
  const now = new Date();
  const { modifiedTime, modifiedDate } = getDosDateTime(now);
  const preparedFiles: PreparedZipFile[] = [];
  const localParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of zipFiles) {
    const pathBytes = textEncoderEncode(file.path.replace(/\\/g, "/"));
    const data = await blobToUint8Array(file.blob);
    const preparedFile: PreparedZipFile = {
      pathBytes,
      data,
      crc: crc32(data),
      localHeaderOffset: localOffset,
      modifiedTime,
      modifiedDate,
    };
    const localHeader = createLocalFileHeader(preparedFile);

    preparedFiles.push(preparedFile);
    localParts.push(localHeader, data);
    localOffset += localHeader.length + data.length;
  }

  const centralParts = preparedFiles.map(createCentralDirectoryHeader);
  const centralDirectory = concatUint8Arrays(centralParts);
  const localData = concatUint8Arrays(localParts);
  const endOfCentralDirectory = createEndOfCentralDirectory(
    preparedFiles.length,
    centralDirectory.length,
    localData.length,
  );
  const zipData = concatUint8Arrays([localData, centralDirectory, endOfCentralDirectory]);

  const outputBuffer = new ArrayBuffer(zipData.byteLength);
  new Uint8Array(outputBuffer).set(zipData);

  return new Blob([outputBuffer], { type: "application/zip" });
}

export function buildMediaConverterZipName(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `creatorops-media-converter-${year}-${month}-${day}.zip`;
}
