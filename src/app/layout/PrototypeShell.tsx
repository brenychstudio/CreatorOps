// src/app/layout/PrototypeShell.tsx
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";

import Stepper from "../../components/prototype/Stepper";
import ReadoutRail from "../../components/prototype/ReadoutRail";

const tools = [{ key: "bio-builder", label: "Bio Builder", path: "/prototype/bio-builder" }] as const;

export default function PrototypeShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const isBioBuilderRoute = location.pathname.startsWith("/prototype/bio-builder");

  useEffect(() => {
    if (location.pathname === "/prototype" || location.pathname === "/prototype/") {
      navigate("/prototype/library", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="proto-theme min-h-dvh bg-[color:var(--co-bg)] text-[color:var(--co-text)]">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/", { replace: false })}
              className="rounded-full border border-[color:var(--co-border)] bg-transparent px-3 py-1.5 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] pressable"
            >
              Exit
            </button>
            <div className="text-sm text-[color:var(--co-muted)]">Interactive Prototype</div>
          </div>

          <Stepper />
        </div>

        {/* Secondary nav */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
            Tools
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tools.map((tool) => {
              const active = location.pathname.startsWith(tool.path);

              return (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => navigate(tool.path)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs transition pressable",
                    "border-[color:var(--co-border)]",
                    active
                      ? "bg-[color:var(--co-surface)] text-[color:var(--co-text)]"
                      : "bg-transparent text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)] hover:text-[color:var(--co-text)]",
                  ].join(" ")}
                >
                  {tool.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <div className="mt-4 grid grid-cols-12 gap-4">
          <div
            className={[
              "col-span-12",
              isBioBuilderRoute ? "lg:col-span-12" : "lg:col-span-9",
            ].join(" ")}
          >
            <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, filter: "blur(6px)", y: -6 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {!isBioBuilderRoute && (
            <div className="col-span-12 lg:col-span-3">
              <ReadoutRail />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
