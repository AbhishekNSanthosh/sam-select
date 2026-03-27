"use client";

import { useEffect } from "react";

export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    // Push dummy state to intercept the back button
    window.history.pushState({ modalOpen: true }, "");

    const handlePopState = () => {
      // The user hit the hardware back button or swipe-back on mobile.
      // The browser natively pops our dummy state. We just tell React to close the UI layer.
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      
      // If the UI was closed by the user pressing 'X' instead of the hardware back button, 
      // the dummy state is still stuck in the history stack! 
      // We need to safely pop it ourselves, so the next back press doesn't just do nothing.
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}
