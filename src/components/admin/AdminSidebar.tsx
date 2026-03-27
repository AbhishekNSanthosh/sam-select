"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Images,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Events",
    href: "/admin/events",
    icon: Calendar,
    exact: false,
  },
  {
    label: "Albums",
    href: "/admin/albums",
    icon: Images,
    exact: false,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(item: (typeof NAV)[0]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D6C3A3] to-[#B89B72] flex items-center justify-center shadow-sm shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="font-display text-base text-[#2B2B2B] leading-tight">
              Sam&apos;s Creations
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#D6C3A3]">
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-[#EDE7DD] mb-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-[#D6C3A3] text-white shadow-sm"
                  : "text-[#6B6B6B] hover:bg-[#F2EDE5] hover:text-[#2B2B2B]"
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-white" : "text-[#D6C3A3] group-hover:text-[#2B2B2B]"
                )}
              />
              {item.label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-6 mt-4 space-y-1">
        <div className="mx-2 h-px bg-[#EDE7DD] mb-3" />
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D6C3A3] to-[#B89B72] flex items-center justify-center shrink-0">
            <span className="text-white text-[11px] font-bold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#2B2B2B] truncate">Administrator</p>
            <p className="text-[10px] text-[#6B6B6B]">Full access</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6B6B6B] hover:bg-red-50 hover:text-red-600 transition-all duration-150 group"
        >
          <LogOut size={17} className="shrink-0 group-hover:text-red-500" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-[#EDE7DD] h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-[#EDE7DD]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D6C3A3] to-[#B89B72] flex items-center justify-center">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="font-display text-base text-[#2B2B2B]">Sam&apos;s Creations</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2EDE5] transition-colors"
        >
          <Menu size={18} className="text-[#2B2B2B]" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 backdrop"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 z-50 w-64 bg-white shadow-2xl animate-slide-up-left">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2EDE5]"
            >
              <X size={16} className="text-[#6B6B6B]" />
            </button>
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
