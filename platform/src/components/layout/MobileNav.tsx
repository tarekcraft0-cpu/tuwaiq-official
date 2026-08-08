"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Trophy,
  Users,
  Vote,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "الرئيسية", icon: Home, hard: true },
  { href: "/hub", label: "البطولات", icon: Trophy },
  { href: "/players", label: "اللاعبون", icon: Users },
  { href: "/votes", label: "التصويت", icon: Vote },
  { href: "/more", label: "المزيد", icon: MoreHorizontal },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#1a100d]/94 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? false
              : item.href === "/hub"
                ? pathname === "/hub" || pathname.startsWith("/tournaments")
                : pathname.startsWith(item.href);
          const className = cn(
            "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 text-[10px] leading-tight transition duration-300 sm:text-[11px]",
            active
              ? "text-[var(--gold-soft)]"
              : "text-zinc-400 active:scale-95",
          );
          const iconClass = cn(
            "transition duration-300",
            active && "drop-shadow-[0_0_8px_rgba(212,168,75,0.45)]",
          );

          if ("hard" in item && item.hard) {
            return (
              <a key={item.href} href={item.href} className={className}>
                <Icon size={20} className={iconClass} />
                <span className="truncate">{item.label}</span>
              </a>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              <Icon size={20} className={iconClass} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
