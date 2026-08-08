"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Navbar } from "@/components/layout/Navbar";

/** يخفي التنقل في صفحات رابط التسجيل (/j و /r) لتبقى صفحة تسجيل فقط */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const registrationOnly =
    pathname.startsWith("/j/") || pathname.startsWith("/r/");

  if (registrationOnly) {
    return (
      <main className="flex min-h-full flex-1 flex-col bg-[var(--bg)]">
        {children}
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 page-pad">{children}</main>
      <Footer />
      <MobileNav />
    </>
  );
}
