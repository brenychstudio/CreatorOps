import type { ReactNode } from "react";
import type { DeviceStageMotion, DeviceStagePreset, DeviceStageVariant } from "./types";

export type DeviceStageProps = {
  children: ReactNode;
  className?: string;
  variant?: DeviceStageVariant;
  motion?: DeviceStageMotion;
  preset?: DeviceStagePreset;
};

export function DeviceStage({
  children,
  className = "",
  variant = "hero",
  motion = "static",
  preset = "dark-premium",
}: DeviceStageProps) {
  const stageClassName = [
    "bs-device-stage",
    `bs-device-stage--${variant}`,
    `bs-device-stage--${motion}`,
    `bs-device-stage--${preset}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={stageClassName}>{children}</div>;
}
