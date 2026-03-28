"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Images,
  LogOut,
  Menu,
  X,
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
      {/* Logo — same height as AdminPageHeader */}
      <div className="flex items-center px-5 py-5 border-b border-[#EDE7DD] shrink-0">
        <Image
          src="/logo.png"
          alt="Sam's Creations"
          width={120}
          height={38}
          className="object-contain w-auto h-auto"
          loading="eager"
          priority
        />
      </div>

      {/* Nav label */}
      <div className="px-5 pt-6 pb-2">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-[#B0A090]">
          Navigation
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
                active
                  ? "bg-[#D6C3A3] text-white font-semibold"
                  : "text-[#6B6B6B] font-medium hover:bg-[#F5F0E8] hover:text-[#2B2B2B]"
              )}
            >
              {/* Active left accent bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white/50" />
              )}
              <item.icon
                size={17}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-white" : "text-[#C4B09A] group-hover:text-[#B89B72]"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + sign out */}
      <div className="px-3 pb-5 mt-2 shrink-0">
        <div className="h-px bg-[#EDE7DD] mx-2 mb-3" />

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D6C3A3] to-[#B89B72] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#2B2B2B] truncate">Administrator</p>
            <p className="text-[10px] text-[#A09080]">Full access</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6B6B6B] hover:bg-red-50 hover:text-red-500 transition-all duration-150 group"
        >
          <LogOut size={16} className="shrink-0 group-hover:text-red-500 transition-colors" />
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-white border-b border-[#EDE7DD]">
        <Image
          src="/logo.png"
          alt="Sam's Creations"
          width={100}
          height={32}
          className="object-contain w-auto h-auto"
          loading="eager"
          priority
        />
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
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-[#EDE7DD]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2EDE5] transition-colors"
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
