// src/components/prototype/FlowEmptyState.tsx
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  desc?: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel?: string;
  secondaryTo?: string;
};

export default function FlowEmptyState({
  title,
  desc,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-5 shadow-sm text-[color:var(--co-text)]">
      <div className="text-base text-[color:var(--co-text)]">{title}</div>
      {desc ? <div className="mt-1 text-sm text-[color:var(--co-muted)]">{desc}</div> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(primaryTo)}
          className="rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
        >
          {primaryLabel}
        </button>

        {secondaryLabel && secondaryTo ? (
          <button
            type="button"
            onClick={() => navigate(secondaryTo)}
            className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
