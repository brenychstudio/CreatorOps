export type AtmosphericBackdropProps = {
  variant?: "studio" | "neutral" | "museum";
  intensity?: "low" | "medium" | "high";
  className?: string;
};

export function AtmosphericBackdrop({
  variant = "neutral",
  intensity = "medium",
  className = "",
}: AtmosphericBackdropProps) {
  return (
    <div
      className={[
        "bs-atmo",
        `bs-atmo--${variant}`,
        `bs-atmo--${intensity}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <div className="bs-atmo__field" />
      <div className="bs-atmo__grid" />
      <div className="bs-atmo__glow bs-atmo__glow--hero" />
      <div className="bs-atmo__glow bs-atmo__glow--lower" />
      <div className="bs-atmo__texture" />
    </div>
  );
}
