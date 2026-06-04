import { useMemo } from "react";
import { useLocation } from "react-router-dom";

type WorkspaceFocusBarProps = {
  isFocusMode: boolean;
  onExit: () => void;
};

const ROUTE_LABELS: Array<[string, string]> = [
  ["/prototype/library", "Library"],
  ["/prototype/smart-mix", "Smart Mix"],
  ["/prototype/planner", "Planner"],
  ["/prototype/captions", "Captions"],
  ["/prototype/export", "Export"],
  ["/prototype/media-converter", "Media Converter"],
  ["/prototype/client-review", "Client Review"],
  ["/prototype/bio-builder", "Profile Handoff"],
];

function getModuleLabel(pathname: string) {
  const match = ROUTE_LABELS.find(([path]) => pathname.startsWith(path));
  return match?.[1] ?? "Workspace";
}

export function WorkspaceFocusBar({ isFocusMode, onExit }: WorkspaceFocusBarProps) {
  const location = useLocation();

  const moduleLabel = useMemo(() => getModuleLabel(location.pathname), [location.pathname]);

  if (!isFocusMode) return null;

  return (
    <div className="co-focus-bar" role="region" aria-label="Workspace focus mode">
      <div className="co-focus-bar__brand">
        <span className="co-focus-bar__mark" aria-hidden="true" />
        <span>CreatorOps</span>
      </div>

      <div className="co-focus-bar__status">
        <span>Focus Mode</span>
        <strong>{moduleLabel}</strong>
        <em>Week Pack 01</em>
      </div>

      <button type="button" onClick={onExit} className="co-focus-bar__exit">
        Exit Focus
      </button>
    </div>
  );
}
