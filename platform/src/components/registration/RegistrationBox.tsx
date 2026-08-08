"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Settings2, Trash2 } from "lucide-react";
import { PendingEditDialog } from "@/components/registration/PendingEditDialog";
import { Countdown } from "@/components/ui/Countdown";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { UsernamePicker } from "@/components/ui/UsernamePicker";
import { useStore } from "@/context/StoreContext";
import {
  formatRegistrationDeadline,
  isRegistrationOpen,
} from "@/lib/registration";
import { getTakenUsernames } from "@/lib/registration-taken";
import { isStaff } from "@/lib/roles";
import { formatLabels, getTournamentFormat } from "@/lib/tournament-format";
import type { RegistrationRequest, Tournament } from "@/lib/types";

type Step =
  | { status: "pick-self" }
  | { status: "pick-team"; self: string }
  | { status: "done"; extrasLeft: number };

const EXTRA_OTHERS_LIMIT = 2;

/** خانة تسجيل — بدون كلمة مرور */
export function RegistrationBox({
  tournament,
  compact,
  hideStaffActions,
}: {
  tournament: Tournament;
  compact?: boolean;
  hideStaffActions?: boolean;
}) {
  const {
    user,
    players,
    submitRegistration,
    deleteRegistrationLink,
    updatePendingRegistration,
    rejectRegistration,
  } = useStore();
  const format = getTournamentFormat(tournament);
  const me = players.find((p) => p.id === user?.id);
  const staff = isStaff(me?.role ?? user?.role);

  const [selfUsername, setSelfUsername] = useState("");
  const [teammateUsername, setTeammateUsername] = useState("");
  const [step, setStep] = useState<Step>({ status: "pick-self" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasRegisteredOnce, setHasRegisteredOnce] = useState(false);
  const [extrasLeft, setExtrasLeft] = useState(EXTRA_OTHERS_LIMIT);
  const [editing, setEditing] = useState<RegistrationRequest | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const open = isRegistrationOpen(tournament);
  const pending = tournament.pendingRegistrations ?? [];
  const needed = Math.max(2, tournament.size);
  const registeredCount = pending.length + tournament.participants.length;
  const remaining = Math.max(0, needed - registeredCount);
  const overflow = Math.max(0, registeredCount - needed);
  const unit = format === "duo" ? "فريق" : "لاعب";

  const takenReasons = useMemo(() => {
    const map = getTakenUsernames(tournament);
    const obj: Record<string, string> = {};
    for (const [k, v] of map) obj[k] = v;
    return obj;
  }, [tournament]);

  async function registerEntry(input: {
    username: string;
    teammateUsername?: string;
    teammate2Username?: string;
  }) {
    setLoading(true);
    setError(false);
    setMsg("");
    const res = await submitRegistration(tournament.id, input);
    setLoading(false);
    if (!res.ok) {
      setError(true);
      setMsg(res.error || "فشل التسجيل");
      return false;
    }
    setError(false);
    setMsg(
      format === "duo"
        ? "تم تسجيل التيم بنجاح."
        : "تم التسجيل في البطولة بنجاح.",
    );
    return true;
  }

  function markDone() {
    if (hasRegisteredOnce) {
      const next = Math.max(0, extrasLeft - 1);
      setExtrasLeft(next);
      setStep({ status: "done", extrasLeft: next });
    } else {
      setHasRegisteredOnce(true);
      setExtrasLeft(EXTRA_OTHERS_LIMIT);
      setStep({ status: "done", extrasLeft: EXTRA_OTHERS_LIMIT });
    }
    setSelfUsername("");
    setTeammateUsername("");
  }

  async function submitSelf() {
    const name = selfUsername.trim();
    if (name.length < 2) {
      setError(true);
      setMsg("اختر أو اكتب يوزرك");
      return;
    }
    if (/\s/.test(name) || name.length > 32) {
      setError(true);
      setMsg("اليوزر بدون مسافات وبحد أقصى 32 حرف");
      return;
    }
    const reason = takenReasons[name.toLowerCase()];
    if (reason) {
      setError(true);
      setMsg(`ما تقدر تختار هذا الشخص: ${reason}`);
      return;
    }
    if (format === "duo") {
      setStep({ status: "pick-team", self: name });
      setError(false);
      setMsg("");
      return;
    }
    const ok = await registerEntry({ username: name });
    if (ok) markDone();
  }

  async function submitTeam() {
    if (step.status !== "pick-team") return;
    const mate = teammateUsername.trim();
    if (mate.length < 2) {
      setError(true);
      setMsg("اختر أو اكتب يوزر شريكك");
      return;
    }
    if (mate.toLowerCase() === step.self.toLowerCase()) {
      setError(true);
      setMsg("شريكك لازم يكون يوزر غيرك");
      return;
    }
    const reason = takenReasons[mate.toLowerCase()];
    if (reason) {
      setError(true);
      setMsg(`ما تقدر تختار ${mate}: ${reason}`);
      return;
    }
    const ok = await registerEntry({
      username: step.self,
      teammateUsername: mate,
    });
    if (ok) markDone();
  }

  function beginRegisterOthers() {
    if (step.status !== "done" || step.extrasLeft <= 0) return;
    setExtrasLeft(step.extrasLeft);
    setStep({ status: "pick-self" });
    setSelfUsername("");
    setTeammateUsername("");
    setMsg(
      format === "duo"
        ? `سجّل تيماً آخر — متبقي ${step.extrasLeft}.`
        : `سجّل شخصاً آخر — متبقي ${step.extrasLeft}.`,
    );
    setError(false);
  }

  const selfPlayer =
    step.status === "pick-team"
      ? players.find(
          (p) => p.username.toLowerCase() === step.self.toLowerCase(),
        )
      : undefined;

  return (
    <section
      id={`t-${tournament.id}`}
      className="panel scroll-mt-24 border-[var(--gold)]/25 p-5 sm:p-6"
    >
      {!compact ? (
        <>
          <p className="text-xs tracking-[0.2em] text-[var(--gold)]">
            تسجيل للبطولة القادمة · {formatLabels[format]}
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            {tournament.name}
          </h2>
        </>
      ) : (
        <p className="text-xs tracking-[0.2em] text-[var(--gold)]">
          {formatLabels[format]}
        </p>
      )}
      <p className="mt-2 text-sm text-[var(--muted)]">
        {format === "duo"
          ? "اختر أو اكتب يوزرك ثم شريك تيمك — لو مو بالقائمة ينشأ حساب تلقائي."
          : "اختر أو اكتب يوزرك — لو مو بالقائمة ينشأ حساب تلقائي. بدون كلمة مرور."}
      </p>

      <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-[var(--gold-soft)]">
            المسجّلون: {registeredCount}/{needed} {unit}
            {overflow > 0 ? (
              <span className="ms-2 text-amber-300">(+{overflow} زيادة)</span>
            ) : null}
          </span>
          <span className="text-xs text-[var(--muted)]">
            {remaining > 0
              ? `يتبقى ${remaining}`
              : overflow > 0
                ? `فوق المطلوب · التسجيل مفتوح`
                : "اكتمل العدد · يمكن التسجيل زيادة"}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full transition-all duration-500 ${
              overflow > 0 ? "bg-amber-400" : "bg-[var(--gold)]"
            }`}
            style={{
              width: `${Math.min(100, (registeredCount / Math.max(needed, registeredCount)) * 100)}%`,
            }}
          />
        </div>
        {overflow > 0 ? (
          <p className="text-xs text-amber-200/90">
            العدد تفوّق على المطلوب ({needed}). الزيادة تدخل القرعة عند إنشاء
            البطولة.
          </p>
        ) : null}

        {pending.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            لم يُسجَّل أحد بعد؛ ستظهر أسماء المسجّلين هنا فور انضمامهم.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted)]">
              أسماء المسجّلين ({pending.length})
            </p>
            <div className="max-h-72 space-y-1.5 overflow-auto scrollbar-thin">
              {pending.map((req, index) => {
                const known = players.find(
                  (p) =>
                    p.id === req.userId ||
                    p.username.toLowerCase() === req.username.toLowerCase(),
                );
                const knownMate = req.teammateUsername
                  ? players.find(
                      (p) =>
                        p.id === req.teammateUserId ||
                        p.username.toLowerCase() ===
                          req.teammateUsername!.toLowerCase(),
                    )
                  : undefined;
                const mates = [req.teammateUsername, req.teammate2Username]
                  .filter(Boolean)
                  .join(" + ");
                return (
                  <div
                    key={req.id}
                    className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#121218] px-2.5 py-2"
                  >
                    <span className="w-6 shrink-0 text-center text-xs text-[var(--gold)]">
                      #{index + 1}
                    </span>
                    <div className="flex shrink-0 items-center -space-x-2 rtl:space-x-reverse">
                      <SafeAvatar
                        src={known?.avatar || "/logo.png"}
                        alt={req.username}
                        size={32}
                      />
                      {format === "duo" ? (
                        <SafeAvatar
                          src={knownMate?.avatar || "/logo.png"}
                          alt={req.teammateUsername || "شريك"}
                          size={32}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      {format === "duo" && mates ? (
                        <div className="leading-snug">
                          <p dir="ltr" className="username-ltr font-bold">
                            {req.username}
                          </p>
                          <p
                            dir="ltr"
                            className="username-ltr text-sm text-[var(--gold-soft)]"
                          >
                            + {mates}
                          </p>
                        </div>
                      ) : (
                        <p dir="ltr" className="username-ltr font-bold">
                          {req.username}
                        </p>
                      )}
                    </div>
                    {staff ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          title="تعديل"
                          className="rounded-lg border border-white/10 p-1.5 text-[var(--gold-soft)] transition hover:bg-white/5"
                          onClick={() => {
                            setEditError("");
                            setEditing(req);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="حذف"
                          className="rounded-lg border border-white/10 p-1.5 text-red-300 transition hover:bg-white/5"
                          onClick={async () => {
                            if (
                              !confirm(
                                format === "duo"
                                  ? "حذف هذا التيم من المسجّلين؟"
                                  : "حذف هذا اللاعب من المسجّلين؟",
                              )
                            ) {
                              return;
                            }
                            const res = await rejectRegistration(
                              tournament.id,
                              req.id,
                            );
                            if (!res.ok) {
                              setError(true);
                              setMsg(res.error || "فشل الحذف");
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {staff && pending.length > 0 ? (
              <p className="text-xs text-[var(--muted)]">
                المشرف: عدّل التيمات قبل إنشاء القرعة — التعديل يدخل القرعة
                تلقائياً.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {editing ? (
        <PendingEditDialog
          key={editing.id}
          open
          tournament={tournament}
          request={editing}
          players={players}
          loading={editLoading}
          error={editError}
          onClose={() => {
            if (editLoading) return;
            setEditing(null);
            setEditError("");
          }}
          onSave={(input) => {
            void (async () => {
              setEditLoading(true);
              setEditError("");
              const res = await updatePendingRegistration(
                tournament.id,
                editing.id,
                input,
              );
              setEditLoading(false);
              if (!res.ok) {
                setEditError(res.error || "فشل التعديل");
                return;
              }
              setEditing(null);
              setError(false);
              setMsg(
                format === "duo"
                  ? "تم تحديث التيم — يدخل القرعة بهذه الأسماء."
                  : "تم تحديث المسجّل — يدخل القرعة بهذا الاسم.",
              );
            })();
          }}
        />
      ) : null}

      {tournament.registrationEndsAt ? (
        <div className="mt-4 max-w-md">
          <p className="mb-2 text-xs text-[var(--muted)]">
            يغلق: {formatRegistrationDeadline(tournament.registrationEndsAt)}
          </p>
          {open ? <Countdown date={tournament.registrationEndsAt} /> : null}
        </div>
      ) : null}

      {!open ? (
        <p className="mt-4 text-sm text-red-300">التسجيل مغلق حالياً</p>
      ) : step.status === "done" ? (
        <div className="mt-5 space-y-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold-dim)] p-4">
          <p className="font-bold text-[var(--gold-soft)]">تم التسجيل ✓</p>
          <p className="text-sm text-[var(--muted)]">
            ظاهر في قائمة المسجّلين أعلاه.
          </p>
          {step.extrasLeft > 0 ? (
            <button
              type="button"
              className="btn-gold w-full"
              onClick={beginRegisterOthers}
            >
              {format === "duo"
                ? `تسجيل تيم آخر / غيرك (متبقي ${step.extrasLeft})`
                : `تسجيل شخص آخر (متبقي ${step.extrasLeft})`}
            </button>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              وصلت للحد الأقصى لتسجيل غيرك من هنا.
            </p>
          )}
        </div>
      ) : step.status === "pick-team" ? (
        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-sm text-[var(--muted)]">عضو التيم الأول — أنت</p>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold-dim)] px-3 py-3">
              <SafeAvatar
                src={selfPlayer?.avatar || "/logo.png"}
                alt={step.self}
                size={40}
              />
              <div className="min-w-0">
                <p dir="ltr" className="username-ltr text-lg font-bold">
                  {step.self}
                </p>
                <p className="text-xs text-[var(--muted)]">مختار مسبقاً</p>
              </div>
            </div>
          </div>
          <UsernamePicker
            label="عضو التيم الثاني — شريكك"
            value={teammateUsername}
            onChange={setTeammateUsername}
            players={players}
            defaultMode="pick"
            allowCustom
            placeholder="ابحث أو اكتب يوزر الشريك"
            excludeUsernames={[step.self]}
            disabledReasons={takenReasons}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              className="btn-gold disabled:opacity-70"
              onClick={() => void submitTeam()}
            >
              {loading ? "جاري..." : "تسجيل التيم"}
            </button>
            <button
              type="button"
              className="btn-ghost !px-4 !py-2 text-sm"
              onClick={() => {
                setStep({ status: "pick-self" });
                setTeammateUsername("");
              }}
            >
              رجوع
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <UsernamePicker
            label={hasRegisteredOnce ? "يوزر اللاعب" : "يوزرك في Plato"}
            value={selfUsername}
            onChange={setSelfUsername}
            players={players}
            allowCustom
            defaultMode="pick"
            placeholder="اكتب يوزرك حتى لو مو بالقائمة"
            disabledReasons={takenReasons}
          />
          <button
            type="button"
            disabled={loading || !selfUsername.trim()}
            className="btn-gold w-full disabled:opacity-70"
            onClick={() => void submitSelf()}
          >
            {loading
              ? "جاري..."
              : format === "duo"
                ? "متابعة لاختيار التيم"
                : "تسجيل"}
          </button>
        </div>
      )}

      {msg ? (
        <p
          className={`mt-3 text-sm ${
            error ? "text-red-300" : "text-[var(--gold-soft)]"
          }`}
        >
          {msg}
        </p>
      ) : null}

      {staff && !hideStaffActions ? (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <Link
            href={`/tournaments/${tournament.id}/settings`}
            className="btn-gold !px-3 !py-2 text-sm"
          >
            <Settings2 size={14} />
            إعدادات التسجيل
          </Link>
          <button
            type="button"
            className="btn-ghost !px-3 !py-2 text-sm text-red-300"
            onClick={async () => {
              if (
                !confirm(
                  "هل تؤكد حذف رابط التسجيل؟\nسيُحذف الرابط وجميع المسجّلين فيه نهائياً.",
                )
              ) {
                return;
              }
              await deleteRegistrationLink(tournament.id);
            }}
          >
            حذف الرابط
          </button>
        </div>
      ) : null}
    </section>
  );
}
