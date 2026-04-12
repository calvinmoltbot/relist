"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Sparkles,
  TrendingUp,
  Zap,
  Settings,
  HelpCircle,
  PackageOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Describe", href: "/describe", icon: Sparkles },
  { label: "Financials", href: "/profit", icon: TrendingUp },
  { label: "Deals", href: "/deals", icon: Zap },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all min-h-[44px] md:min-h-0",
              isActive
                ? "bg-zinc-800/60 text-emerald-400 font-semibold"
                : "text-zinc-300 hover:bg-zinc-800/40 hover:text-emerald-400",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="mb-6 flex items-center gap-3 px-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
        <PackageOpen className="size-5 text-emerald-950" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-xl font-bold tracking-tight text-emerald-400">
          ReList
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-300">
          Reseller Portal
        </span>
      </div>
    </div>
  );
}

function UserFooter() {
  return (
    <div className="mt-auto border-t border-white/[0.05] px-5 pt-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400 ring-2 ring-emerald-500/30">
          L
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-zinc-100">Lily</span>
          <span className="text-[10px] text-emerald-400">Pro Seller</span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-white/[0.05] bg-zinc-950 py-7">
      <Brand />
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <UserFooter />
    </aside>
  );
}
