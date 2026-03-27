import { cn } from "@/lib/utils/cn";

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D6C3A3] to-[#B89B72] flex items-center justify-center shadow-sm">
          <span className="text-white font-display text-sm font-bold">S</span>
        </div>
        <span className="font-display text-xl tracking-wide text-[#2B2B2B]">
          Sam&apos;s Creations
        </span>
      </div>
      <span className="text-[10px] tracking-[0.25em] uppercase text-[#6B6B6B] mt-0.5">
        Album Selection
      </span>
    </div>
  );
}
