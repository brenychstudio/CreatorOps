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
const MEDIA_CONVERTER_HANDOFF_RECOVERY_KEY = "creatorops:media-converter-handoff-recovery:v1";
const MEDIA_CONVERTER_HANDOFF_RECOVERY_MS = 10_000;

export function writeMediaConverterHandoff(payload: MediaConverterHandoffPayload) {
  sessionStorage.setItem(MEDIA_CONVERTER_HANDOFF_KEY, JSON.stringify(payload));
}

export function readMediaConverterHandoff(): MediaConverterHandoffPayload | null {
  try {
    const raw = sessionStorage.getItem(MEDIA_CONVERTER_HANDOFF_KEY);
    if (!raw) {
      const recoveryRaw = sessionStorage.getItem(MEDIA_CONVERTER_HANDOFF_RECOVERY_KEY);
      if (!recoveryRaw) return null;

      const recovery = JSON.parse(recoveryRaw) as { expiresAt?: number; payload?: MediaConverterHandoffPayload };
      sessionStorage.removeItem(MEDIA_CONVERTER_HANDOFF_RECOVERY_KEY);

      if (!recovery?.expiresAt || recovery.expiresAt < Date.now() || !recovery.payload) return null;
      if (recovery.payload.version !== "v1") return null;
      if (recovery.payload.source !== "export-week-pack") return null;
      if (!Array.isArray(recovery.payload.items)) return null;

      return recovery.payload;
    }

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
  const raw = sessionStorage.getItem(MEDIA_CONVERTER_HANDOFF_KEY);
  if (raw) {
    try {
      sessionStorage.setItem(
        MEDIA_CONVERTER_HANDOFF_RECOVERY_KEY,
        JSON.stringify({ expiresAt: Date.now() + MEDIA_CONVERTER_HANDOFF_RECOVERY_MS, payload: JSON.parse(raw) })
      );
    } catch {
      sessionStorage.removeItem(MEDIA_CONVERTER_HANDOFF_RECOVERY_KEY);
    }
  }

  sessionStorage.removeItem(MEDIA_CONVERTER_HANDOFF_KEY);
}
