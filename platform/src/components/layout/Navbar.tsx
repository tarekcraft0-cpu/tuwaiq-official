"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ImagePlus,
  LogOut,
  Menu,
  Search,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { isStaff, roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/#members", label: "الأعضاء" },
  { href: "/#arena", label: "البطولات" },
  { href: "/join", label: "تسجيل" },
  { href: "/rankings", label: "الترتيب" },
  { href: "/players", label: "اللاعبون" },
  { href: "/shop", label: "المتجر" },
  { href: "/votes", label: "التصويت" },
  { href: "/more", label: "المزيد" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    logout,
    players,
    tournaments,
    notifications,
    setNotifications,
    storageMode,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { players: [], tournaments: [] };
    return {
      players: players
        .filter((p) => p.username.toLowerCase().includes(q))
        .slice(0, 5),
      tournaments: tournaments
        .filter((t) => t.name.toLowerCase().includes(q))
        .slice(0, 5),
    };
  }, [query, players, tournaments]);

  const unread = notifications.filter((n) => !n.read).length;
  const me = players.find((p) => p.id === user?.id);
  const staff = isStaff(me?.role ?? user?.role);

  useEffect(() => {
    setProfileOpen(false);
    setNotifOpen(false);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!profileRef.current?.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#1a100d]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link href="/" className="flex items-center gap-3 transition duration-300 hover:opacity-90">
          <Image
            src="/logo.png"
            alt="طويق"
            width={48}
            height={48}
            className="h-11 w-11 rounded-full bg-white object-cover ring-1 ring-[var(--gold)]/40"
            priority
          />
          <div className="leading-tight">
            <div className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide gold-text">
              طويق
            </div>
            <div className="text-[11px] text-[var(--muted)]">قروب طويق — مكان واحد</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm transition duration-300",
                pathname === link.href
                  ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span
            className={`hidden rounded-full border px-2.5 py-1 text-[10px] sm:inline ${
              storageMode === "supabase"
                ? "border-emerald-400/30 text-emerald-300"
                : "border-white/10 text-zinc-500"
            }`}
            title={
              storageMode === "supabase"
                ? "التخزين على السيرفر"
                : "تخزين محلي مؤقت"
            }
          >
            {storageMode === "supabase" ? "سيرفر" : "محلي"}
          </span>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="icon-btn"
            aria-label="بحث"
          >
            <Search size={18} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen) {
                  setNotifications((prev) =>
                    prev.map((n) => ({ ...n, read: true })),
                  );
                }
              }}
              className="icon-btn relative"
              aria-label="إشعارات"
            >
              <Bell size={18} />
              {unread > 0 ? (
                <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[10px] font-bold text-black">
                  {unread}
                </span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="absolute left-0 top-12 z-50 w-80 rounded-2xl border border-white/10 bg-[#121218] p-3 shadow-2xl">
                <p className="mb-2 text-sm font-bold">الإشعارات</p>
                <div className="max-h-72 space-y-2 overflow-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">لا إشعارات بعد</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5"
                      >
                        <p className="text-sm font-semibold">{n.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 px-2 py-1.5 transition duration-300 hover:border-[var(--gold)]/40"
                aria-label="قائمة الملف الشخصي"
              >
                <SafeAvatar
                  src={me?.avatar || user.avatar}
                  alt={user.username}
                  size={28}
                />
                <span
                  dir="ltr"
                  className="username-ltr hidden max-w-[7rem] truncate text-sm sm:inline"
                >
                  {user.username}
                </span>
                <ChevronDown size={14} className="text-zinc-400" />
              </button>
              {profileOpen ? (
                <div className="absolute left-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#121218] py-2 shadow-2xl">
                  <div className="border-b border-white/5 px-3 pb-2">
                    <p
                      dir="ltr"
                      className="username-ltr truncate text-sm font-bold"
                    >
                      {user.username}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {roleLabel(me?.role ?? user.role)}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-white/5"
                  >
                    <UserRound size={16} className="text-[var(--gold)]" />
                    ملفي وإحصائياتي
                  </Link>
                  <Link
                    href="/profile#avatar"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-white/5"
                  >
                    <ImagePlus size={16} className="text-[var(--gold)]" />
                    تغيير الأفاتار
                  </Link>
                  {staff ? (
                    <Link
                      href="/admin"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-white/5"
                    >
                      <Shield size={16} className="text-[var(--gold)]" />
                      لوحة المشرفين
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      router.push("/");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm text-red-300 transition hover:bg-white/5"
                  >
                    <LogOut size={16} />
                    تسجيل الخروج
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn-ghost !px-3 !py-2 text-sm">
                <UserRound size={16} />
                دخول
              </Link>
              <Link href="/register" className="btn-gold !px-3 !py-2 text-sm">
                إنشاء حساب
              </Link>
            </div>
          )}

          <button
            type="button"
            className="icon-btn lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="border-t border-white/5 bg-[#0c0c10] px-4 py-3 lg:px-6">
          <div className="mx-auto max-w-7xl">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن لاعب أو بطولة..."
              className="input-field"
            />
            {query.trim() ? (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs text-[var(--muted)]">اللاعبون</p>
                  {results.players.length === 0 ? (
                    <p className="text-sm text-zinc-500">لا نتائج</p>
                  ) : (
                    results.players.map((p) => (
                      <Link
                        key={p.id}
                        href={`/players/${p.id}`}
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                        }}
                        className="flex items-center gap-2 border-b border-white/5 py-2 text-sm transition hover:text-[var(--gold-soft)]"
                      >
                        <SafeAvatar src={p.avatar} alt={p.username} size={24} />
                        <span dir="ltr" className="username-ltr">
                          {p.username}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs text-[var(--muted)]">البطولات</p>
                  {results.tournaments.length === 0 ? (
                    <p className="text-sm text-zinc-500">لا نتائج</p>
                  ) : (
                    results.tournaments.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tournaments/${t.id}`}
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                        }}
                        className="block border-b border-white/5 py-2 text-sm transition hover:text-[var(--gold-soft)]"
                      >
                        {t.name}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="border-t border-white/5 bg-[#0c0c10] px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-full px-3 py-2.5 text-sm transition",
                  pathname === link.href
                    ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
                    : "text-zinc-300",
                )}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3 py-2.5 text-sm text-[var(--gold-soft)]"
                >
                  ملفي الشخصي
                </Link>
                {staff ? (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-full px-3 py-2.5 text-sm text-[var(--gold-soft)]"
                  >
                    لوحة المشرفين
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setOpen(false);
                    router.push("/");
                  }}
                  className="rounded-full px-3 py-2.5 text-start text-sm text-red-300"
                >
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3 py-2.5 text-sm"
                >
                  دخول
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3 py-2.5 text-sm text-[var(--gold-soft)]"
                >
                  إنشاء حساب
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
