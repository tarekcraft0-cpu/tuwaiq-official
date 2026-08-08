"use client";

import { useEffect, useState } from "react";
import { UsernamePicker } from "@/components/ui/UsernamePicker";
import type { Player } from "@/lib/types";

type Mode = "solo" | "duo";

/** تعبئة / استبدال خانة في الشجرة — بحث أو كتابة */
export function BracketSlotDialog({
  open,
  title,
  mode,
  players,
  loading,
  error,
  onClose,
  onSubmitSolo,
  onSubmitDuo,
}: {
  open: boolean;
  title: string;
  mode: Mode;
  players: Player[];
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSubmitSolo: (username: string) => void;
  onSubmitDuo: (username1: string, username2: string) => void;
}) {
  const [u1, setU1] = useState("");
  const [u2, setU2] = useState("");

  useEffect(() => {
    if (open) {
      setU1("");
      setU2("");
    }
  }, [open]);

  if (!open) return null;

  const canSubmit =
    mode === "solo"
      ? u1.trim().length >= 2
      : u1.trim().length >= 2 &&
        u2.trim().length >= 2 &&
        u1.trim().toLowerCase() !== u2.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-[var(--gold)]/30 bg-[#121218] p-5 shadow-2xl">
        <div>
          <p className="text-xs tracking-[0.15em] text-[var(--gold)]">
            {mode === "duo" ? "تعبئة تيم" : "تعبئة لاعب"}
          </p>
          <h3 className="mt-1 text-lg font-bold">{title}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            ابحث من كل يوزرات الموقع أو اكتب يوزر جديد
          </p>
        </div>

        {mode === "solo" ? (
          <UsernamePicker
            label="اليوزر"
            value={u1}
            onChange={setU1}
            players={players}
            allowCustom
            defaultMode="pick"
            placeholder="ابحث أو اكتب اليوزر"
          />
        ) : (
          <div className="space-y-4">
            <UsernamePicker
              label="عضو التيم الأول"
              value={u1}
              onChange={setU1}
              players={players}
              allowCustom
              defaultMode="pick"
              excludeUsernames={u2 ? [u2] : []}
              placeholder="ابحث أو اكتب"
            />
            <UsernamePicker
              label="عضو التيم الثاني"
              value={u2}
              onChange={setU2}
              players={players}
              allowCustom
              defaultMode="pick"
              excludeUsernames={u1 ? [u1] : []}
              placeholder="ابحث أو اكتب"
            />
          </div>
        )}

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
            disabled={loading || !canSubmit}
            onClick={() => {
              if (mode === "solo") onSubmitSolo(u1.trim());
              else onSubmitDuo(u1.trim(), u2.trim());
            }}
          >
            {loading ? "جاري..." : "تأكيد"}
          </button>
        </div>
      </div>
    </div>
  );
}
