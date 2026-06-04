import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "creatorops:workspace-focus-mode:v0";

function canUseStorage() {
  if (typeof window === "undefined") return false;

  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readStoredFocusMode() {
  if (!canUseStorage()) return false;

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;

  const tag = target.tagName.toLowerCase();

  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

export function useWorkspaceFocusMode() {
  const [isFocusMode, setIsFocusMode] = useState(readStoredFocusMode);

  useEffect(() => {
    if (!canUseStorage()) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, String(isFocusMode));
    } catch {
      // localStorage may be unavailable in privacy mode.
    }
  }, [isFocusMode]);

  useEffect(() => {
    if (!isFocusMode) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === "Escape") {
        setIsFocusMode(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFocusMode]);

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((current) => !current);
  }, []);

  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false);
  }, []);

  return {
    isFocusMode,
    toggleFocusMode,
    exitFocusMode,
  };
}
