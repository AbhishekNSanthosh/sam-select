import { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function AdminPageHeader({ title, subtitle, action }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-[#EDE7DD] bg-white/70 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="font-display text-2xl text-[#2B2B2B]">{title}</h1>
        {subtitle && <p className="text-sm text-[#6B6B6B] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
