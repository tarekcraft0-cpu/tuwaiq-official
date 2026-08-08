"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useStore } from "@/context/StoreContext";
import { safeNextPath } from "@/lib/registration";

function RegisterForm() {
  const { register, user, ready } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next")) || "/profile";
  const presetUsername = (searchParams.get("username") || "").trim();
  const [username, setUsername] = useState(presetUsername);
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (presetUsername) setUsername(presetUsername);
  }, [presetUsername]);

  useEffect(() => {
    if (ready && user) router.replace(nextPath);
  }, [ready, user, router, nextPath]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await register({ username, password, avatar });
      if (!res.ok) {
        setError(res.error ?? "فشل إنشاء الحساب");
        return;
      }
      router.push(nextPath);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 pb-24 lg:pb-12">
      <div className="mb-8 text-center">
        <Image
          src="/logo.png"
          alt="طويق"
          width={72}
          height={72}
          className="mx-auto h-[72px] w-[72px] rounded-full bg-white object-cover"
        />
        <h1 className="section-title mt-4 text-3xl font-bold">إنشاء حساب</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          انضم لقروب طويق بيوزرك في Plato.
        </p>
      </div>

      <form onSubmit={onSubmit} className="panel space-y-4 p-6">
        <div className="rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold-dim)] px-3 py-3 text-sm leading-7 text-[var(--gold-soft)]">
          ملاحظة: اكتب يوزرك في الموقع ليكون نفس يوزرك في لعبة Plato تماماً.
          {nextPath.startsWith("/j/")
            ? " بعد إنشاء الحساب ستعود لصفحة تسجيل البطولة تلقائياً."
            : ""}
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
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            className="input-field"
            required
            disabled={loading}
            autoComplete="new-password"
          />
        </label>

        <div>
          <span className="mb-2 block text-sm text-[var(--muted)]">
            الصورة الشخصية
          </span>
          <AvatarUpload value={avatar} onChange={setAvatar} />
        </div>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !ready}
          className="btn-gold w-full disabled:cursor-wait disabled:opacity-80"
        >
          {loading ? (
            <>
              <LoadingSpinner className="text-[#14110b]" />
              جاري إنشاء الحساب...
            </>
          ) : !ready ? (
            <>
              <LoadingSpinner className="text-[#14110b]" />
              جاري التحميل...
            </>
          ) : (
            "إنشاء الحساب"
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        لديك حساب؟{" "}
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="text-[var(--gold-soft)]"
        >
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
          <LoadingSpinner />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
