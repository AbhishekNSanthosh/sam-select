"use client";

import { useState, useCallback } from "react";

export function useSelection(initial: string[] = []) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return {
    selected,
    selectedArray: Array.from(selected),
    count: selected.size,
    toggle,
    remove,
    clear,
    isSelected,
    setSelected,
  };
}
