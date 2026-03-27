import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "blush" | "green" | "gray" | "amber";
  className?: string;
}

export default function Badge({ children, variant = "gold", className }: BadgeProps) {
  const variants = {
    gold: "bg-[#D6C3A3]/15 text-[#7A6340] border border-[#D6C3A3]/30",
    blush: "bg-[#B89B72]/20 text-[#8B6E3F] border border-[#B89B72]/40",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    gray: "bg-[#6B6B6B]/10 text-[#6B6B6B] border border-[#6B6B6B]/20",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
