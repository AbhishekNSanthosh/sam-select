import { cn } from "@/lib/utils/cn";

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src="/logo.png"
        alt="Sam's Creations"
        className="h-8 sm:h-12 w-auto object-contain pointer-events-none select-none"
      />
    </div>
  );
}
