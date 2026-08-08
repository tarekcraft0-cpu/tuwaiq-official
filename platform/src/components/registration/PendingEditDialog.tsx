"use client";

import { useMemo, useState } from "react";
import { UsernamePicker } from "@/components/ui/UsernamePicker";
import { getTakenUsernames } from "@/lib/registration-taken";
import { getTournamentFormat } from "@/lib/tournament-format";
import type { Player, RegistrationRequest, Tournament } from "@/lib/types";

export function PendingEditDialog({
  open,
  tournament,
  request,
  players,
  loading,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  tournament: Tournament;
  request: RegistrationRequest;
  players: Player[];
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (input: {
    username: string;
    teammateUsername?: string;
    teammate2Username?: string;
  }) => void;
}) {
  const format = getTournamentFormat(tournament);
  const [username, setUsername] = useState(request.username);
  const [teammateUsername, setTeammateUsername] = useState(
    request.teammateUsername || "",
  );
  const [localError, setLocalError] = useState("");

  const takenReasons = useMemo(() => {
    const map = getTakenUsernames(tournament, {
      excludeRequestId: request.id,
    });
    const obj: Record<string, string> = {};
    for (const [k, v] of map) obj[k] = v;
    return obj;
  }, [tournament, request.id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="إغلاق"
        disabled={loading}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-[var(--gold)]/30 bg-[#121218] p-5">
        <div>
          <h3 className="text-lg font-bold">
            {format === "duo" ? "تعديل التيم" : "تعديل المسجّل"}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            التعديل يُحفظ فوراً ويدخل القرعة عند إنشائها بهذه الأسماء.
          </p>
        </div>

        <UsernamePicker
          label={format === "duo" ? "عضو التيم الأول" : "يوزر Plato"}
          value={username}
          onChange={setUsername}
          players={players}
          allowCustom
          defaultMode="pick"
          placeholder="ابحث أو اكتب اليوزر"
          disabledReasons={takenReasons}
        />

        {format === "duo" ? (
          <UsernamePicker
            label="عضو التيم الثاني — الشريك"
            value={teammateUsername}
            onChange={setTeammateUsername}
            players={players}
            allowCustom
            defaultMode="pick"
            placeholder="ابحث أو اكتب يوزر الشريك"
            excludeUsernames={[username]}
            disabledReasons={takenReasons}
          />
        ) : null}

        {(error || localError) && (
          <p className="text-sm text-red-300">{error || localError}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-gold flex-1 disabled:opacity-70"
            disabled={loading}
            onClick={() => {
              setLocalError("");
              const u1 = username.trim();
              const u2 = teammateUsername.trim();
              if (u1.length < 2) {
                setLocalError("اختر يوزر صحيح");
                return;
              }
              if (format === "duo") {
                if (u2.length < 2) {
                  setLocalError("اختر يوزر الشريك");
                  return;
                }
                if (u1.toLowerCase() === u2.toLowerCase()) {
                  setLocalError("لازم يوزرين مختلفين");
                  return;
                }
              }
              onSave({
                username: u1,
                teammateUsername: format === "duo" ? u2 : undefined,
              });
            }}
          >
            {loading ? "جاري الحفظ..." : "حفظ التعديل"}
          </button>
          <button
            type="button"
            className="btn-ghost !px-4"
            disabled={loading}
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
