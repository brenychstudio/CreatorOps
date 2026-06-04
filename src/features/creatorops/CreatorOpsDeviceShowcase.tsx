import {
  LaptopFrame,
  type DeviceCompanionMode,
  type DeviceStageMotion,
} from "../../systems/device-presentation";

type CreatorOpsDeviceShowcaseProps = {
  variant?: "hero" | "compact";
  motion?: DeviceStageMotion;
  showCompanion?: boolean;
  className?: string;
};

export function CreatorOpsDeviceShowcase({
  variant = "hero",
  motion = "static",
  showCompanion = false,
  className = "",
}: CreatorOpsDeviceShowcaseProps) {
  const companionMode: DeviceCompanionMode = showCompanion && variant === "hero" ? "small" : "hidden";

  return (
    <LaptopFrame
      className={[
        "creatorops-device-showcase",
        `creatorops-device-showcase--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      screenSrc="/creatorops/landing/screens/creatorops-desktop-hero.webp"
      screenAlt="CreatorOps desktop workspace showing Extended Pack export and handoff workflow"
      screenFit="cover"
      screenTone="dark-ui"
      screenPosition="center 46%"
      companionSrc="/creatorops/landing/screens/creatorops-phone-companion.webp"
      companionAlt="CreatorOps responsive mobile workspace companion preview"
      companionMode={companionMode}
      variant={variant}
      motion={motion}
      preset="dark-premium"
    />
  );
}
