// src/app/layout/PrototypeShell.tsx
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";

import Stepper from "../../components/prototype/Stepper";
import ReadoutRail from "../../components/prototype/ReadoutRail";

export default function PrototypeShell() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/prototype" || location.pathname === "/prototype/") {
      navigate("/prototype/library", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="proto-theme co-os-root h-dvh overflow-hidden bg-[color:var(--co-bg)] text-[color:var(--co-text)]">
      <div className="co-os-atmosphere" aria-hidden="true" />

      <div className="co-os-stage">
        {/* Top bar */}
        <div className="co-product-topbar co-shell-bar flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5 sm:px-4 lg:flex-nowrap">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => navigate("/", { replace: false })}
              className="rounded-full border border-[color:var(--co-border-soft)] bg-transparent px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] pressable"
            >
              Home
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm text-[color:var(--co-text)]">CreatorOps</div>
              <div className="truncate text-[11px] text-[color:var(--co-muted)]">
                Week Pack 01 &middot; draft saved
              </div>
            </div>
          </div>

          <div className="co-stepper-track w-full min-w-0 rounded-full p-1 md:w-auto">
            <Stepper />
          </div>
        </div>

        <div className="co-product-tools">
          <ReadoutRail mode="compact" />
        </div>

        {/* Main */}
        <main className="co-product-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="h-full min-h-0 min-w-0"
              initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(6px)", y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
