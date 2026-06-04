import { DeviceStage } from "./DeviceStage";
import { ScreenSlot } from "./ScreenSlot";
import type {
  DeviceCompanionMode,
  DeviceStageMotion,
  DeviceStagePreset,
  DeviceStageVariant,
  ScreenSlotFit,
  ScreenSlotTone,
} from "./types";

export type LaptopFrameProps = {
  screenSrc: string;
  screenAlt: string;
  screenFit?: ScreenSlotFit;
  screenTone?: ScreenSlotTone;
  screenPosition?: string;
  companionSrc?: string;
  companionAlt?: string;
  companionMode?: DeviceCompanionMode;
  className?: string;
  variant?: DeviceStageVariant;
  motion?: DeviceStageMotion;
  preset?: DeviceStagePreset;
};

export function LaptopFrame({
  screenSrc,
  screenAlt,
  screenFit = "cover",
  screenTone = "dark-ui",
  screenPosition = "center",
  companionSrc,
  companionAlt = "",
  companionMode = "hidden",
  className = "",
  variant = "hero",
  motion = "static",
  preset = "dark-premium",
}: LaptopFrameProps) {
  const loading = variant === "hero" ? "eager" : "lazy";

  return (
    <DeviceStage className={className} variant={variant} motion={motion} preset={preset}>
      <div className="bs-device-laptop" aria-label={screenAlt}>
        <div className="bs-device-laptop__screen-shell">
          <div className="bs-device-laptop__bezel">
            <div className="bs-device-laptop__notch" aria-hidden="true" />
            <ScreenSlot
              src={screenSrc}
              alt={screenAlt}
              fit={screenFit}
              tone={screenTone}
              position={screenPosition}
              loading={loading}
            />
            <div className="bs-device-laptop__glass" aria-hidden="true" />
            <div className="bs-device-laptop__reflection" aria-hidden="true" />
            <div className="bs-device-laptop__glow" aria-hidden="true" />
            <div className="bs-device-laptop__display-chin" aria-hidden="true" />
          </div>
        </div>

        <div className="bs-device-laptop__hinge" aria-hidden="true">
          <span className="bs-device-laptop__hinge-cap bs-device-laptop__hinge-cap--left" />
          <span className="bs-device-laptop__hinge-cap bs-device-laptop__hinge-cap--right" />
        </div>

        <div className="bs-device-laptop__base" aria-hidden="true">
          <div className="bs-device-laptop__base-surface" />
          <div className="bs-device-laptop__speaker bs-device-laptop__speaker--left" />
          <div className="bs-device-laptop__speaker bs-device-laptop__speaker--right" />
          <div className="bs-device-laptop__keyboard-plane" />
          <div className="bs-device-laptop__trackpad" />
          <div className="bs-device-laptop__base-edge" />
          <div className="bs-device-laptop__front-lip" />
        </div>

        <div className="bs-device-laptop__shadow" aria-hidden="true" />
      </div>

      {companionSrc && companionMode !== "hidden" ? (
        <div className={`bs-device-companion bs-device-companion--${companionMode}`} aria-hidden={companionAlt ? undefined : true}>
          <img src={companionSrc} alt={companionAlt} loading={loading} decoding="async" draggable={false} />
        </div>
      ) : null}
    </DeviceStage>
  );
}
