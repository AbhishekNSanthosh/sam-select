"use client";

import { cn } from "@/lib/utils/cn";
import Button from "@/components/ui/Button";
import { Images } from "lucide-react";

interface SelectionBarProps {
  count: number;
  isLocked: boolean;
  submitting: boolean;
  onViewSelection: () => void;
  onSubmit: () => void;
}

export default function SelectionBar({
  count,
  isLocked,
  submitting,
  onViewSelection,
  onSubmit,
}: SelectionBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30",
        "glass border-t border-[#D6C3A3]/20 px-4 py-3 pb-safe",
        "transition-transform duration-300",
        count === 0 && !isLocked ? "translate-y-full" : "translate-y-0"
      )}
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-xl mx-auto flex items-center gap-3">
        {/* Count badge */}
        <button
          onClick={onViewSelection}
          className="flex items-center gap-2 bg-[#D6C3A3]/10 border border-[#D6C3A3]/30 rounded-xl px-3 py-2 hover:bg-[#D6C3A3]/20 transition-colors"
        >
          <Images size={16} className="text-[#D6C3A3]" />
          <span className="text-sm font-medium text-[#2B2B2B]">
            {count} selected
          </span>
        </button>

        {/* View selection */}
        <Button
          variant="outline"
          size="sm"
          onClick={onViewSelection}
          className="flex-1"
        >
          View Selection
        </Button>

        {/* Submit */}
        {!isLocked && (
          <Button
            variant="gold"
            size="sm"
            onClick={onSubmit}
            loading={submitting}
            disabled={count === 0}
            className="flex-1"
          >
            Submit Album
          </Button>
        )}

        {isLocked && (
          <div className="flex-1 text-center text-sm text-[#6B6B6B] italic font-display">
            Album submitted ✓
          </div>
        )}
      </div>
    </div>
  );
}
