"use client";

import { useMemo, useState } from "react";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import {
  usernameMatchesQuery,
  usernameSearchKey,
} from "@/data/plato-group-usernames";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

export function UsernamePicker({
  label,
  value,
  onChange,
  players,
  placeholder = "اكتب يوزر Plato",
  defaultMode = "type",
  excludeUsernames = [],
  pickOnly = false,
  /** يوزر → سبب التعطيل (مثلاً مسجّل مسبقاً) */
  disabledReasons = {},
  allowCustom = false,
}: {
  label: string;
  value: string;
  onChange: (username: string) => void;
  players: Player[];
  placeholder?: string;
  /** pick = يفتح قائمة كل اليوزرات مباشرة */
  defaultMode?: "type" | "pick";
  excludeUsernames?: string[];
  /** قائمة اختيار فقط بدون وضع الكتابة الحرة */
  pickOnly?: boolean;
  disabledReasons?: Record<string, string>;
  /** يسمح باستخدام نص البحث كيوزر حتى لو مو موجود بالقائمة */
  allowCustom?: boolean;
}) {
  const [mode, setMode] = useState<"type" | "pick">(
    pickOnly ? "pick" : defaultMode,
  );
  const [query, setQuery] = useState("");

  const disabledMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const [k, v] of Object.entries(disabledReasons)) {
      m.set(k.trim().toLowerCase(), v);
    }
    return m;
  }, [disabledReasons]);

  const filtered = useMemo(() => {
    const excluded = new Set(
      excludeUsernames.map((x) => x.trim().toLowerCase()).filter(Boolean),
    );
    return players
      .filter((p) => !excluded.has(p.username.toLowerCase()))
      .filter((p) => usernameMatchesQuery(p.username, query))
      .sort((a, b) => {
        const aTaken = disabledMap.has(a.username.toLowerCase()) ? 1 : 0;
        const bTaken = disabledMap.has(b.username.toLowerCase()) ? 1 : 0;
        if (aTaken !== bTaken) return aTaken - bTaken;
        const ak = usernameSearchKey(a.username);
        const bk = usernameSearchKey(b.username);
        return ak.localeCompare(bk, undefined, { sensitivity: "base" });
      });
  }, [players, query, excludeUsernames, disabledMap]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        {!pickOnly ? (
          <div className="flex rounded-full border border-white/10 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("type")}
              className={cn(
                "rounded-full px-2.5 py-1 transition",
                mode === "type"
                  ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
                  : "text-zinc-400",
              )}
            >
              كتابة
            </button>
            <button
              type="button"
              onClick={() => setMode("pick")}
              className={cn(
                "rounded-full px-2.5 py-1 transition",
                mode === "pick"
                  ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
                  : "text-zinc-400",
              )}
            >
              اختيار يوزر
            </button>
          </div>
        ) : null}
      </div>

      {mode === "type" && !pickOnly ? (
        <div className="space-y-2">
          <input
            className="input-field username-ltr"
            dir="ltr"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required
          />
          <button
            type="button"
            className="text-xs text-[var(--gold-soft)] underline-offset-2 hover:underline"
            onClick={() => setMode("pick")}
          >
            أو اختر من قائمة أعضاء الموقع
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            className="input-field username-ltr"
            dir="ltr"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب أول حرف من اليوزر للتصفية..."
            autoFocus={pickOnly}
          />
          <div className="max-h-64 space-y-1 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-2 scrollbar-thin">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-xs text-[var(--muted)]">لا نتائج</p>
            ) : (
              filtered.map((p) => {
                const reason = disabledMap.get(p.username.toLowerCase());
                const disabled = Boolean(reason);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      onChange(p.username);
                      if (!pickOnly) setMode("type");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-start text-sm transition",
                      disabled
                        ? "cursor-not-allowed opacity-45"
                        : "hover:bg-white/5",
                      value.toLowerCase() === p.username.toLowerCase() &&
                        !disabled &&
                        "bg-[var(--gold-dim)]",
                    )}
                  >
                    <SafeAvatar src={p.avatar} alt={p.username} size={28} />
                    <span className="min-w-0 flex-1">
                      <span
                        dir="ltr"
                        className="username-ltr block font-semibold"
                      >
                        {p.username}
                      </span>
                      {reason ? (
                        <span className="mt-0.5 block text-[11px] leading-4 text-red-300/90">
                          {reason}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {allowCustom && query.trim().length >= 2 ? (
            <button
              type="button"
              className="btn-ghost w-full !py-2 text-sm"
              onClick={() => {
                const custom = query.trim();
                const reason = disabledMap.get(custom.toLowerCase());
                if (reason) return;
                onChange(custom);
                if (!pickOnly) setMode("type");
              }}
            >
              استخدم اليوزر المكتوب:{" "}
              <span dir="ltr" className="username-ltr font-bold">
                {query.trim()}
              </span>
            </button>
          ) : null}
          <p className="text-xs text-[var(--muted)]">
            {filtered.length} من {players.length} يوزر
            {allowCustom ? " · تقدر تكتب يوزر مو موجود" : ""}
            {value ? (
              <>
                {" "}
                · المختار:{" "}
                <span
                  dir="ltr"
                  className="username-ltr text-[var(--gold-soft)]"
                >
                  {value}
                </span>
              </>
            ) : null}
          </p>
        </div>
      )}
    </div>
  );
}
