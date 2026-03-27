"use client";

import { useEffect, useRef } from "react";

/**
 * Intercepts the browser/hardware back button while a modal/overlay is open.
 * Pushes a sentinel history entry on open; pops it cleanly on close.
 */
export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  // keep the ref current without re-running the effect
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ _lightboxOpen: true }, "");

    const handlePopState = () => {
      // Ignore the popstate if we artificially triggered it via history.back()
      // This normally happens during React Strict Mode unmount/remount cycles.
      if ((window as any).__expected_pops > 0) {
        (window as any).__expected_pops--;
        return;
      }
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      // If the component is unmounting (e.g. user clicked X, or Strict Mode),
      // we need to remove the sentinel from the history stack.
      if (window.history.state?._lightboxOpen) {
        // Register an expected artificial pop
        (window as any).__expected_pops = ((window as any).__expected_pops || 0) + 1;
        
        window.history.back();
      }
    };
  }, [isOpen]);
}
