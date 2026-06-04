import type { CSSProperties } from "react";
import type { ScreenSlotFit, ScreenSlotTone } from "./types";

export type ScreenSlotProps = {
  src: string;
  alt: string;
  fit?: ScreenSlotFit;
  tone?: ScreenSlotTone;
  position?: string;
  loading?: "eager" | "lazy";
};

export function ScreenSlot({
  src,
  alt,
  fit = "cover",
  tone = "dark-ui",
  position = "center",
  loading = "lazy",
}: ScreenSlotProps) {
  const imageStyle: CSSProperties = { objectPosition: position };

  return (
    <div
      className={[
        "bs-device-screen-slot",
        `bs-device-screen-slot--fit-${fit}`,
        `bs-device-screen-slot--tone-${tone}`,
      ].join(" ")}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        draggable={false}
        style={imageStyle}
      />
    </div>
  );
}
