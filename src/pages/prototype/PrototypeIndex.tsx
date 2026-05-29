import { useNavigate } from "react-router-dom";

export default function PrototypeIndex() {
  const nav = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl text-black">CreatorOps Workspace</div>
        <div className="mt-1 text-sm text-black/55">
          Library to Smart Mix to Planner to Captions to Export.
        </div>
      </div>

      <button
        onClick={() => nav("/prototype/library")}
        className="rounded-full bg-black px-4 py-2 text-sm text-white hover:bg-black/90 pressable"
      >
        Start Week Pack
      </button>
    </div>
  );
}
