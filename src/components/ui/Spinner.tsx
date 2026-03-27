import { cn } from "@/lib/utils/cn";

export default function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 rounded-full border-2 border-[#D6C3A3]/30 border-t-[#D6C3A3] animate-spin",
        className
      )}
    />
  );
}
