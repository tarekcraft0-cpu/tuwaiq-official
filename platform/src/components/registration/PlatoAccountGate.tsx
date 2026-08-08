"use client";

import Link from "next/link";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { UsernamePicker } from "@/components/ui/UsernamePicker";
import { useStore } from "@/context/StoreContext";
import { registrationSharePath } from "@/lib/registration";
import type { Tournament } from "@/lib/types";

type Step =
  | { status: "pick" }
  | { status: "loading" }
  | { status: "missing"; username: string }
  | { status: "unclaimed"; username: string }
  | { status: "claimed"; username: string }
  | { status: "error"; message: string };

/**
 * اختيار يوزر من كل أعضاء الموقع بالبحث، ثم تفعيل/دخول الحساب.
 */
export function PlatoAccountGate({
  tournament,
  nextPath,
}: {
  tournament?: Tournament;
  nextPath?: string;
}) {
  const { login, claimAccount, storageMode, players } = useStore();
  const shareNext =
    nextPath || (tournament ? registrationSharePath(tournament) : "/");
  const authNext = encodeURIComponent(shareNext);

  const [selected, setSelected] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>({ status: "pick" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function continueWithUsername(name: string) {
    const username = name.trim();
    if (username.length < 2) {
      setStep({ status: "error", message: "اختر يوزر Plato من القائمة" });
      return;
    }
    setSelected(username);
    setError("");
    setStep({ status: "loading" });

    if (storageMode !== "supabase") {
      setStep({ status: "missing", username });
      return;
    }

    try {
      const res = await fetch(
        `/api/auth/claim?username=${encodeURIComponent(username)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!json?.ok) {
        setStep({
          status: "error",
          message: json?.error || "تعذر التحقق من اليوزر",
        });
        return;
      }
      if (!json.exists) {
        setStep({ status: "missing", username: json.username || username });
        return;
      }
      if (json.unclaimed) {
        setStep({ status: "unclaimed", username: json.username || username });
        return;
      }
      setStep({ status: "claimed", username: json.username || username });
    } catch {
      setStep({ status: "error", message: "تعذر الاتصال بالسيرفر" });
    }
  }

  async function activateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (step.status !== "unclaimed") return;
    setBusy(true);
    setError("");
    try {
      const res = await claimAccount(step.username, password);
      if (!res.ok) setError(res.error || "فشل تفعيل الحساب");
    } finally {
      setBusy(false);
    }
  }

  async function loginAccount(e: React.FormEvent) {
    e.preventDefault();
    if (step.status !== "claimed") return;
    setBusy(true);
    setError("");
    try {
      const res = await login(step.username, password, "member");
      if (!res.ok) setError(res.error || "فشل تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold-dim)] p-4">
      <div className="flex items-start gap-3">
        <UserRound className="mt-0.5 shrink-0 text-[var(--gold)]" size={22} />
        <div>
          <p className="font-bold text-[var(--gold-soft)]">
            اختر يوزرك من أعضاء القروب
          </p>
          <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
            اضغط وابحث — اكتب أول حرف من يوزرك وتصفّى القائمة لحد ما تلقى
            حسابك، ثم عيّن كلمة مرور أو ادخل.
          </p>
        </div>
      </div>

      {step.status === "pick" ||
      step.status === "loading" ||
      step.status === "error" ? (
        <div className="space-y-3">
          <UsernamePicker
            label="يوزر Plato"
            value={selected}
            onChange={setSelected}
            players={players}
            defaultMode="pick"
            pickOnly
            placeholder="اكتب أول حرف..."
          />
          {step.status === "error" ? (
            <p className="text-sm text-red-300">{step.message}</p>
          ) : null}
          <button
            type="button"
            disabled={!selected.trim() || step.status === "loading"}
            className="btn-gold w-full disabled:opacity-70"
            onClick={() => void continueWithUsername(selected)}
          >
            {step.status === "loading" ? "جاري التحقق..." : "متابعة بهذا اليوزر"}
          </button>
        </div>
      ) : null}

      {step.status === "unclaimed" ? (
        <form className="space-y-3" onSubmit={activateAccount}>
          <p className="text-sm text-[var(--muted)]">
            يوزرك{" "}
            <span dir="ltr" className="username-ltr font-bold text-white">
              {step.username}
            </span>{" "}
            جاهز من قائمة القروب — عيّن كلمة مرور للدخول لحسابك.
          </p>
          <label className="block text-sm">
            <span className="mb-2 block text-[var(--muted)]">
              كلمة مرور جديدة
            </span>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              autoComplete="new-password"
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="btn-gold w-full disabled:opacity-70"
          >
            {busy ? "جاري الدخول..." : "تفعيل الحساب والدخول"}
          </button>
          <button
            type="button"
            className="text-xs text-[var(--muted)] underline"
            onClick={() => {
              setStep({ status: "pick" });
              setPassword("");
              setError("");
            }}
          >
            اختيار يوزر آخر
          </button>
        </form>
      ) : null}

      {step.status === "claimed" ? (
        <form className="space-y-3" onSubmit={loginAccount}>
          <p className="text-sm text-[var(--muted)]">
            مرحباً{" "}
            <span dir="ltr" className="username-ltr font-bold text-white">
              {step.username}
            </span>{" "}
            — أدخل كلمة المرور للدخول.
          </p>
          <label className="block text-sm">
            <span className="mb-2 block text-[var(--muted)]">كلمة المرور</span>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="btn-gold w-full disabled:opacity-70"
          >
            {busy ? "جاري الدخول..." : "دخول"}
          </button>
          <button
            type="button"
            className="text-xs text-[var(--muted)] underline"
            onClick={() => {
              setStep({ status: "pick" });
              setPassword("");
              setError("");
            }}
          >
            اختيار يوزر آخر
          </button>
        </form>
      ) : null}

      {step.status === "missing" ? (
        <div className="space-y-3">
          <p className="text-sm leading-7 text-[var(--muted)]">
            اليوزر{" "}
            <span dir="ltr" className="username-ltr font-bold text-white">
              {step.username}
            </span>{" "}
            غير موجود بعد. أنشئ حساباً بنفس يوزرك في Plato.
          </p>
          <Link
            href={`/register?next=${authNext}&username=${encodeURIComponent(step.username)}`}
            className="btn-gold flex w-full justify-center"
          >
            إنشاء حساب
          </Link>
          <button
            type="button"
            className="text-xs text-[var(--muted)] underline"
            onClick={() => setStep({ status: "pick" })}
          >
            اختيار يوزر آخر
          </button>
        </div>
      ) : null}
    </div>
  );
}
