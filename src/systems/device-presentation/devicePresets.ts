import type { DeviceStagePreset } from "./types";

export const deviceStagePresets: Record<DeviceStagePreset, { label: string; background: string }> = {
  "dark-premium": {
    label: "Dark Premium",
    background: "graphite",
  },
  "museum-tech": {
    label: "Museum Tech",
    background: "deep",
  },
  "product-spotlight": {
    label: "Product Spotlight",
    background: "spotlight",
  },
} as const;
