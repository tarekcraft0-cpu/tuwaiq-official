"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/",
    label: "بيت",
    hard: true,
    icon: (
      <svg className="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
      </svg>
    ),
  },
  {
    href: "/hub",
    label: "بطولات",
    icon: (
      <svg className="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4M7 4h10v2a5 5 0 0 1-10 0V4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 6H5a2 2 0 0 0 2 2h0M17 6h2a2 2 0 0 1-2 2h0" />
      </svg>
    ),
  },
  {
    href: "/players",
    label: "لاعبون",
    icon: (
      <svg className="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74" />
      </svg>
    ),
  },
  {
    href: "/votes",
    label: "تصويت",
    icon: (
      <svg className="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 11 2 2 4-4" />
        <path strokeLinecap="round" d="M8 21h8" />
      </svg>
    ),
  },
  {
    href: "/more",
    label: "المزيد",
    icon: (
      <svg className="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="6" cy="12" r="1.35" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
        <circle cx="18" cy="12" r="1.35" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return false;
  if (href === "/hub") {
    return (
      pathname === "/hub" ||
      pathname.startsWith("/tournaments") ||
      pathname.startsWith("/join") ||
      pathname.startsWith("/rankings")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** نفس شكل قائمة الرئيسية تماماً */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="dock dock-platform" aria-label="القائمة الرئيسية">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const className = cn("dock-item", active && "is-active");

        if ("hard" in item && item.hard) {
          return (
            <a key={item.href} href={item.href} className={className}>
              {item.icon}
              <span>{item.label}</span>
            </a>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={className}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
