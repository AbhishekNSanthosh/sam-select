import { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function AdminPageHeader({ title, subtitle, action }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-row items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-[17px] border-b border-[#EDE7DD] bg-white/80 backdrop-blur-sm sticky top-14 lg:top-0 z-10">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Accent bar */}
        <div className="w-1 h-6 sm:h-8 rounded-full bg-gradient-to-b from-[#D6C3A3] to-[#B89B72] shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg sm:text-xl font-semibold text-[#2B2B2B] leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-[#A09080] mt-0.5 tracking-wide truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
