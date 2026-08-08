"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Crown,
  LogIn,
  Newspaper,
  Scale,
  Swords,
  Trophy,
  Gift,
  Shield,
  UserRound,
} from "lucide-react";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { useStore } from "@/context/StoreContext";
import { isStaff } from "@/lib/roles";

const links = [
  { href: "/join", label: "تسجيل الأسامي", icon: ClipboardList },
  { href: "/shop", label: "المتجر", icon: Gift },
  { href: "/rankings", label: "الترتيب", icon: Trophy },
  { href: "/hall-of-fame", label: "لوحة الشرف", icon: Crown },
  { href: "/news", label: "الأخبار", icon: Newspaper },
  { href: "/calendar", label: "التقويم", icon: CalendarDays },
  { href: "/rules", label: "القوانين", icon: Scale },
  { href: "/prizes", label: "الجوائز", icon: Gift },
  { href: "/h2h", label: "مواجهات مباشرة", icon: Swords },
];

export default function MorePage() {
  const { user, players } = useStore();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 pb-28 lg:pb-12">
      <h1 className="section-title text-3xl font-bold">المزيد</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">اختصارات سريعة للجوال</p>

      <div className="mt-6 grid gap-2">
        {user ? (
          <Link
            href="/profile"
            className="panel panel-hover flex items-center gap-3 px-4 py-3.5"
          >
            <SafeAvatar
              src={
                players.find((p) => p.id === user.id)?.avatar || user.avatar
              }
              alt={user.username}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <p dir="ltr" className="username-ltr truncate font-semibold">
                {user.username}
              </p>
              <p className="text-xs text-[var(--muted)]">ملفي · إحصائياتي · الأفاتار</p>
            </div>
            <UserRound size={18} className="text-[var(--gold)]" />
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="panel panel-hover flex items-center gap-3 px-4 py-3.5"
            >
              <LogIn size={18} className="text-[var(--gold)]" />
              <span className="font-semibold">تسجيل الدخول</span>
            </Link>
            <Link
              href="/register"
              className="panel panel-hover flex items-center gap-3 border-[var(--gold)]/30 px-4 py-3.5"
            >
              <UserRound size={18} className="text-[var(--gold)]" />
              <span className="font-semibold text-[var(--gold-soft)]">
                إنشاء حساب
              </span>
            </Link>
          </>
        )}
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="panel panel-hover flex items-center gap-3 px-4 py-3.5"
            >
              <Icon size={18} className="text-[var(--gold)]" />
              <span className="font-semibold">{item.label}</span>
            </Link>
          );
        })}
        <a
          href="https://instagram.com/tuwaiq"
          target="_blank"
          rel="noopener noreferrer"
          className="panel panel-hover flex items-center gap-3 px-4 py-3.5"
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--gold)]"
            aria-hidden
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          <span className="font-semibold">Instagram @tuwaiq</span>
        </a>
        {isStaff(user?.role) ? (
          <Link
            href="/admin"
            className="panel panel-hover flex items-center gap-3 border-[var(--gold)]/30 px-4 py-3.5"
          >
            <Shield size={18} className="text-[var(--gold)]" />
            <span className="font-semibold text-[var(--gold-soft)]">
              لوحة المشرفين
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
