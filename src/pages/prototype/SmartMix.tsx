// src/pages/prototype/SmartMix.tsx
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";
import { usePrototypeStore } from "../../store/prototypeStore";

function SoftScoreDots({ scoreDots }: { scoreDots: 1 | 2 | 3 }) {
  const on = "bg-[color:var(--co-text)]/80";
  const off = "bg-[color:var(--co-border)]";

  return (
    <div className="flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${scoreDots >= 1 ? on : off}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${scoreDots >= 2 ? on : off}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${scoreDots >= 3 ? on : off}`} />
    </div>
  );
}

export default function SmartMix() {
  const nav = useNavigate();

  const mixes = usePrototypeStore((s) => s.mixes);
  const bestMixId = usePrototypeStore((s) => s.bestMixId);
  const getAssetById = usePrototypeStore((s) => s.getAssetById);

  
  if (!mixes.length) {
    return (
      <FlowEmptyState
        title="No mixes yet"
        desc="Start from Library to upload/select assets and generate Smart Mix candidates."
        primaryLabel="Go to Library"
        primaryTo="/prototype/library"
        secondaryLabel="How it works"
        secondaryTo="/"
      />
    );
  }

const regenerateMixes = usePrototypeStore((s) => s.regenerateMixes);
  const pickBestMix = usePrototypeStore((s) => s.pickBestMix);

  const renderTile = (id?: string) => {
    if (!id) {
      return (
        <div className="aspect-[4/5] w-full rounded-xl bg-[color:var(--co-surface)] border border-[color:var(--co-border)]" />
      );
    }
    const a = getAssetById(id);
    if (!a) {
      return (
        <div className="aspect-[4/5] w-full rounded-xl bg-[color:var(--co-surface)] border border-[color:var(--co-border)]" />
      );
    }
    return (
      <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-[color:var(--co-surface)] border border-[color:var(--co-border)]">
        <img src={a.thumbUrl} alt="" className="h-full w-full object-cover" draggable={false} />
      </div>
    );
  };

  return (
    <div className="space-y-4 text-[color:var(--co-text)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base text-[color:var(--co-text)]">Smart Mix</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">
            Ranked candidates. Minimal guardrails.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void regenerateMixes()}
            className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            Regenerate
          </button>

          <button
            type="button"
            onClick={() => nav("/prototype/sequence")}
            className="rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            Continue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mixes.map((mix) => {
          const isBest = mix.id === bestMixId;

          return (
            <div
              key={mix.id}
              className="rounded-3xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-[color:var(--co-muted)]">Score</div>
                  <SoftScoreDots scoreDots={mix.scoreDots} />

                  {mix.hasConflict ? (
                    <span className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2 py-0.5 text-xs text-[color:var(--co-muted)]">
                      Guardrail
                    </span>
                  ) : null}

                  {isBest ? (
                    <span className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2 py-0.5 text-xs text-[color:var(--co-text)]/80">
                      Selected
                    </span>
                  ) : null}
                </div>

                <button
                  onClick={() => pickBestMix(mix.id)}
                  className="rounded-full border border-[color:var(--co-border)] bg-transparent px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] pressable"
                >
                  Pick as best
                </button>
              </div>

              {/* 3×3 IG-style preview (9 tiles) */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i}>{renderTile(mix.tileIds[i])}</div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {mix.reasons.map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2 py-1 text-xs text-[color:var(--co-muted)]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
