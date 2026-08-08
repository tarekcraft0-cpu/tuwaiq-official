"use client";

import { useEffect, useState } from "react";
import { SafeAvatar } from "@/components/ui/SafeAvatar";

export type MatchScoreSide = {
  id: string;
  label: string;
  avatar?: string;
};

/** نافذة إدخال نتيجة المباراة (خانات فارغة) ثم التأهيل */
export function MatchScoreDialog({
  open,
  title,
  side1,
  side2,
  unitLabel = "لاعب",
  loading,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  side1: MatchScoreSide;
  side2: MatchScoreSide;
  unitLabel?: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (score1: number, score2: number) => void;
}) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");

  useEffect(() => {
    if (open) {
      setS1("");
      setS2("");
    }
  }, [open, side1.id, side2.id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-[var(--gold)]/30 bg-[#121218] p-5 shadow-2xl">
        <div>
          <p className="text-xs tracking-[0.15em] text-[var(--gold)]">
            تسجيل نتيجة
          </p>
          <h3 className="mt-1 text-lg font-bold">{title}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            اكتب نتيجة الطرفين — اللي يوصل 5 يتأهل ({unitLabel} ضد {unitLabel})
          </p>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="space-y-2 text-center">
            <SafeAvatar
              src={side1.avatar || "/logo.png"}
              alt={side1.label}
              size={40}
              className="mx-auto"
            />
            <p dir="ltr" className="username-ltr text-sm font-semibold">
              {side1.label}
            </p>
            <input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              placeholder="—"
              value={s1}
              onChange={(e) => setS1(e.target.value)}
              className="input-field text-center text-lg font-bold"
              autoFocus
            />
          </div>
          <span className="pt-8 text-xl text-[var(--muted)]">-</span>
          <div className="space-y-2 text-center">
            <SafeAvatar
              src={side2.avatar || "/logo.png"}
              alt={side2.label}
              size={40}
              className="mx-auto"
            />
            <p dir="ltr" className="username-ltr text-sm font-semibold">
              {side2.label}
            </p>
            <input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              placeholder="—"
              value={s2}
              onChange={(e) => setS2(e.target.value)}
              className="input-field text-center text-lg font-bold"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={onClose}
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="btn-gold flex-1 disabled:opacity-70"
            disabled={loading || s1.trim() === "" || s2.trim() === ""}
            onClick={() => onSubmit(Number(s1), Number(s2))}
          >
            {loading ? "جاري..." : "تأهيل حسب النتيجة"}
          </button>
        </div>
      </div>
    </div>
  );
}
