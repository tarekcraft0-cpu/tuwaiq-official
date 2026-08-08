"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, UserRound } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useStore } from "@/context/StoreContext";
import { safeNextPath } from "@/lib/registration";
import { isStaff } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Portal = "member" | "admin";

function LoginForm() {
  const { login, user, ready } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [portal, setPortal] = useState<Portal>(
    searchParams.get("portal") === "admin" ? "admin" : "member",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("portal") === "admin") setPortal("admin");
  }, [searchParams]);

  useEffect(() => {
    if (!ready || !user) return;
    if (nextPath) {
      router.replace(nextPath);
      return;
    }
    // المشرف/المالك يدخلون اللوحة مباشرة
    router.replace(isStaff(user.role) ? "/admin" : "/profile");
  }, [ready, user, router, nextPath]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password, portal);
      if (!res.ok) {
        setError(res.error ?? "فشل تسجيل الدخول");
        return;
      }
      if (nextPath) {
        router.push(nextPath);
        return;
      }
      router.push(portal === "admin" ? "/admin" : "/profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12 pb-24 lg:pb-12">
      <div className="mb-8 text-center">
        <Image
          src="/logo.png"
          alt="طويق"
          width={72}
          height={72}
          className="mx-auto h-[72px] w-[72px] rounded-full bg-white object-cover"
        />
        <h1 className="section-title mt-4 text-3xl font-bold">تسجيل الدخول</h1>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-black/30 p-1">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setPortal("member");
            setError("");
          }}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition duration-300",
            portal === "member"
              ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
              : "text-zinc-400 hover:text-white",
          )}
        >
          <UserRound size={16} />
          دخول الأعضاء
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setPortal("admin");
            setError("");
          }}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition duration-300",
            portal === "admin"
              ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
              : "text-zinc-400 hover:text-white",
          )}
        >
          <Shield size={16} />
          دخول المشرفين
        </button>
      </div>

      <motion.form
        key={portal}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onSubmit={onSubmit}
        className="panel space-y-4 p-6"
      >
        <div className="rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold-dim)] px-3 py-3 text-sm leading-7 text-[var(--gold-soft)]">
          {portal === "admin"
            ? "دخول لوحة الإدارة — للمشرفين والمالك فقط. بعد الدخول تروح مباشرة للوحة."
            : "ملاحظة: يرجى كتابة يوزرك في الموقع ليكون نفس يوزرك في لعبة Plato."}
        </div>

        <label className="block text-sm">
          <span className="mb-2 block text-[var(--muted)]">اليوزر (Plato)</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field username-ltr"
            dir="ltr"
            placeholder="نفس اسمك في Plato"
            required
            disabled={loading}
            autoComplete="username"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-[var(--muted)]">كلمة المرور</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !ready}
          className="btn-gold w-full disabled:cursor-wait disabled:opacity-80"
        >
          {loading ? (
            <>
              <LoadingSpinner className="text-[#14110b]" />
              جاري الدخول...
            </>
          ) : !ready ? (
            <>
              <LoadingSpinner className="text-[#14110b]" />
              جاري التحميل...
            </>
          ) : portal === "admin" ? (
            "دخول لوحة المشرفين"
          ) : (
            "دخول"
          )}
        </button>
      </motion.form>

      {portal === "member" ? (
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          ليس لديك حساب؟{" "}
          <Link
            href={
              nextPath
                ? `/register?next=${encodeURIComponent(nextPath)}`
                : "/register"
            }
            className="text-[var(--gold-soft)]"
          >
            إنشاء حساب
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          مشرف؟ بعد الدخول تفتح لوحة إنشاء البطولات والقرعة وروابط التسجيل.
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--muted)]">
          <LoadingSpinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
