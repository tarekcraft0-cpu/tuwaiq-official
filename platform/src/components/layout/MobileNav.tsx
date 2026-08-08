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
  { href: "/", label: "طويق", icon: Home },
  { href: "/hub", label: "المنصة", icon: Trophy },
  { href: "/players", label: "اللاعبون", icon: Users },
  { href: "/votes", label: "التصويت", icon: Vote },
  { href: "/more", label: "المزيد", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#1a100d]/92 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition duration-300",
                active
                  ? "text-[var(--gold-soft)]"
                  : "text-zinc-400 active:scale-95",
              )}
            >
              <Icon
                size={20}
                className={cn(
                  "transition duration-300",
                  active && "drop-shadow-[0_0_8px_rgba(212,168,75,0.45)]",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
