"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Trophy,
  Users,
  MonitorCheck,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "بيت", icon: Home, hard: true },
  { href: "/hub", label: "بطولات", icon: Trophy },
  { href: "/players", label: "لاعبون", icon: Users },
  { href: "/votes", label: "تصويت", icon: MonitorCheck },
  { href: "/more", label: "المزيد", icon: MoreHorizontal },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/10 bg-[#0e0a09]/96 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/hub"
              ? pathname === "/hub" || pathname.startsWith("/tournaments")
              : item.href === "/"
                ? false
                : pathname.startsWith(item.href);
          const className = cn(
            "flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 py-2.5 text-[11px] font-medium leading-tight transition duration-300",
            active
              ? "text-[var(--gold-soft)]"
              : "text-[#c9b49a] active:scale-95",
          );
          const iconClass = cn(
            "transition duration-300",
            active && "drop-shadow-[0_0_8px_rgba(212,168,75,0.45)]",
          );

          if ("hard" in item && item.hard) {
            return (
              <a key={item.href} href={item.href} className={className}>
                <Icon size={22} strokeWidth={1.75} className={iconClass} />
                <span className="truncate">{item.label}</span>
              </a>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              <Icon size={22} strokeWidth={1.75} className={iconClass} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
