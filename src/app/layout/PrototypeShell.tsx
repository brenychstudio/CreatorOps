// src/app/layout/PrototypeShell.tsx
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";

import Stepper from "../../components/prototype/Stepper";
import ReadoutRail from "../../components/prototype/ReadoutRail";

export default function PrototypeShell() {
  const location = useLocation();
  const navigate = useNavigate();

  // Якщо зайшли на /prototype — одразу відкриваємо перший крок.
  useEffect(() => {
    if (location.pathname === "/prototype" || location.pathname === "/prototype/") {
      navigate("/prototype/library", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
  <div className="proto-theme min-h-dvh bg-[color:var(--co-bg)] text-[color:var(--co-text)]">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/", { replace: false })}
              className="rounded-full border border-[color:var(--co-border)] bg-transparent px-3 py-1.5 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] pressable"
            >
              Exit
            </button>
            <div className="text-sm text-[color:var(--co-muted)]">Interactive Prototype</div>
          </div>

          {/* Tabs / stepper */}
          <Stepper />
        </div>

        {/* Main */}
        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-9">
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

          <div className="col-span-12 lg:col-span-3">
            <ReadoutRail />
          </div>
        </div>
      </div>
    </div>
  );
}
