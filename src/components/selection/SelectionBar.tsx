"use client";

import { cn } from "@/lib/utils/cn";
import Button from "@/components/ui/Button";
import { Images, Check } from "lucide-react";

interface SelectionBarProps {
  count: number;
  isLocked: boolean;
  submitting: boolean;
  isSubmitted?: boolean;
  onViewSelection: () => void;
  onSubmit: () => void;
}

export default function SelectionBar({
  count,
  isLocked,
  submitting,
  isSubmitted,
  onViewSelection,
  onSubmit,
}: SelectionBarProps) {
  if (isLocked || count === 0) return null;

  return (
    <div className="fixed bottom-0 sm:bottom-10 inset-x-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-30 animate-slide-up pointer-events-none">
      <div className="bg-white/95 sm:bg-white/90 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.08)] sm:shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-t sm:border border-[#D6C3A3]/40 sm:rounded-full px-4 sm:px-1.5 py-4 sm:py-1.5 flex items-center justify-between sm:justify-start gap-4 sm:gap-1.5 pointer-events-auto pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-1.5 transition-all duration-300">
        
        {/* View Selection Toggle */}
        <button
          onClick={onViewSelection}
          className="flex items-center gap-2 bg-[#FBF9F6] sm:rounded-full rounded-xl pl-4 pr-5 py-2.5 sm:py-2.5 hover:bg-[#EDE7DD]/80 transition-colors shrink-0 border border-transparent hover:border-[#D6C3A3]/20 h-11"
        >
          <Images size={16} className="text-[#B89B72]" />
          <span className="text-sm font-medium text-[#2B2B2B] tabular-nums whitespace-nowrap">
            {count} <span className="hidden sm:inline text-[#6B6B6B] font-normal">Selected</span>
          </span>
        </button>

        {/* Action Button / Status */}
        {isLocked ? (
          <div className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FBF9F6]/50 rounded-xl sm:rounded-full shrink-0 border border-transparent h-11 flex-1 sm:flex-none">
            <Check size={16} className="text-[#B89B72] stroke-[2.5]" />
            <span className="text-sm font-medium text-[#B89B72]">Locked</span>
          </div>
        ) : (
          <Button
            variant="gold"
            onClick={onSubmit}
            loading={submitting}
            disabled={count === 0}
            className="flex-1 sm:flex-none rounded-xl sm:rounded-full px-6 py-2.5 text-sm h-11 focus:ring-0 shadow-sm"
          >
            {isSubmitted ? "Update" : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}
