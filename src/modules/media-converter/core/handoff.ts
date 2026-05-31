export type MediaConverterHandoffSource = "export-week-pack";

export type MediaConverterHandoffItem = {
  id: string;
  src: string;
  filename: string;
  label?: string;
  mimeHint?: "image/jpeg" | "image/png" | "image/webp";
};

export type MediaConverterHandoffPayload = {
  version: "v1";
  source: MediaConverterHandoffSource;
  packTitle: string;
  createdAt: string;
  presetId?: "smaller" | "website" | "social" | "quality" | "transparent";
  items: MediaConverterHandoffItem[];
};

export const MEDIA_CONVERTER_HANDOFF_KEY = "creatorops:media-converter-handoff:v1";

export function writeMediaConverterHandoff(payload: MediaConverterHandoffPayload) {
  sessionStorage.setItem(MEDIA_CONVERTER_HANDOFF_KEY, JSON.stringify(payload));
}

export function readMediaConverterHandoff(): MediaConverterHandoffPayload | null {
  try {
    const raw = sessionStorage.getItem(MEDIA_CONVERTER_HANDOFF_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as MediaConverterHandoffPayload;

    if (parsed?.version !== "v1") return null;
    if (parsed?.source !== "export-week-pack") return null;
    if (!Array.isArray(parsed.items)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function clearMediaConverterHandoff() {
  sessionStorage.removeItem(MEDIA_CONVERTER_HANDOFF_KEY);
}
