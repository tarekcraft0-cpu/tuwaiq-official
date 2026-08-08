"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Settings2, Shuffle, Trophy } from "lucide-react";
import { PendingEditDialog } from "@/components/registration/PendingEditDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { useStore } from "@/context/StoreContext";
import { roundLabel } from "@/lib/bracket";
import {
  findTournamentByShareRef,
  formatRegistrationDeadline,
  isRegistrationOpen,
  registrationSharePath,
  registrationStatusLabel,
  tournamentSharePath,
} from "@/lib/registration";
import {
  getRegistrationPlacement,
  placementLabels,
} from "@/lib/registration-placement";
import { isStaff } from "@/lib/roles";
import {
  entryLabel,
  formatLabels,
  getTournamentFormat,
} from "@/lib/tournament-format";
import type { RegistrationPlacement, RegistrationRequest } from "@/lib/types";
import { copyToClipboard } from "@/lib/utils";

export default function TournamentSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    user,
    players,
    tournaments,
    ready,
    getPlayer,
    recordMatchResult,
    redrawBracket,
    finishTournament,
    setTournaments,
    approveRegistration,
    rejectRegistration,
    updatePendingRegistration,
    createTournamentFromRegistration,
    updateRegistrationCapacity,
    deleteRegistrationLink,
  } = useStore();

  const tournament = findTournamentByShareRef(tournaments, params.id);
  const me = players.find((p) => p.id === user?.id);
  const staff = isStaff(me?.role ?? user?.role);

  const [toast, setToast] = useState("");
  const [scores, setScores] = useState<Record<string, { s1: string; s2: string }>>(
    {},
  );
  const [swapA, setSwapA] = useState("");
  const [swapB, setSwapB] = useState("");
  const [endsAtDraft, setEndsAtDraft] = useState("");
  const [capacityDraft, setCapacityDraft] = useState("");
  const [redrawing, setRedrawing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [editingReq, setEditingReq] = useState<RegistrationRequest | null>(
    null,
  );
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const totalRounds = useMemo(
    () =>
      tournament?.bracket.length
        ? Math.max(...tournament.bracket.map((m) => m.round))
        : 1,
    [tournament],
  );

  const openMatches = useMemo(() => {
    if (!tournament) return [];
    return tournament.bracket
      .filter((m) => m.player1Id && m.player2Id && !m.winnerId)
      .sort((a, b) => a.round - b.round || a.position - b.position);
  }, [tournament]);

  const round1Slots = useMemo(() => {
    if (!tournament) return [];
    return tournament.bracket
      .filter((m) => m.round === 1)
      .sort((a, b) => a.position - b.position);
  }, [tournament]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !staff) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          title="للمشرفين فقط"
          description="إعدادات البطولة متاحة للمالك والمشرفين."
          actionHref="/login?portal=admin"
          actionLabel="دخول المشرفين"
        />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          title="البطولة غير موجودة"
          description="تأكد من الرابط."
          actionHref="/tournaments"
          actionLabel="البطولات"
        />
      </div>
    );
  }

  function setScore(matchId: string, key: "s1" | "s2", value: string) {
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        s1: prev[matchId]?.s1 ?? "",
        s2: prev[matchId]?.s2 ?? "",
        [key]: value,
      },
    }));
  }

  async function advanceWinner(matchId: string) {
    const sc = scores[matchId] ?? { s1: "", s2: "" };
    if (sc.s1.trim() === "" || sc.s2.trim() === "") {
      notify("اكتب نتيجة الطرفين أولاً");
      return;
    }
    const score1 = Number(sc.s1);
    const score2 = Number(sc.s2);
    if (Number.isNaN(score1) || Number.isNaN(score2)) {
      notify("أدخل نتيجة صحيحة");
      return;
    }
    const res = await recordMatchResult({
      tournamentId: tournament!.id,
      matchId,
      score1,
      score2,
    });
    notify(
      res.ok
        ? "تم تأهيل صاحب الـ5 أهداف للجولة التالية"
        : res.error || "فشل",
    );
    if (res.ok) {
      setScores((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    }
  }

  async function redraw() {
    if (redrawing) return;
    if (
      !confirm(
        "إعادة سحب القرعة؟\nبتتغير المواجهات فوراً وتنمسح النتائج الحالية للشجرة.",
      )
    ) {
      return;
    }
    setRedrawing(true);
    const res = await redrawBracket(tournament!.id);
    setRedrawing(false);
    setScores({});
    setSwapA("");
    setSwapB("");
    notify(res.ok ? "تم سحب قرعة جديدة فوراً" : res.error || "فشل إعادة السحب");
  }

  function swapPlayers() {
    if (!swapA || !swapB || swapA === swapB) {
      notify("اختر لاعبين مختلفين للتبديل");
      return;
    }
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id !== tournament!.id) return t;
        const bracket = t.bracket.map((m) => {
          if (m.round !== 1 || m.winnerId) return m;
          const next = { ...m };
          if (next.player1Id === swapA) next.player1Id = swapB;
          else if (next.player1Id === swapB) next.player1Id = swapA;
          if (next.player2Id === swapA) next.player2Id = swapB;
          else if (next.player2Id === swapB) next.player2Id = swapA;
          return next;
        });
        const participants = t.participants.map((id) =>
          id === swapA ? swapB : id === swapB ? swapA : id,
        );
        return { ...t, bracket, participants };
      }),
    );
    notify("تم تبديل مكان اللاعبين في القرعة");
    setSwapA("");
    setSwapB("");
  }

  async function copyRegisterLink() {
    const url = `${window.location.origin}${registrationSharePath(tournament!)}`;
    const ok = await copyToClipboard(url);
    notify(ok ? "تم نسخ الرابط القصير" : "تعذر النسخ");
  }

  async function copyTournamentLink() {
    const url = `${window.location.origin}${tournamentSharePath(tournament!)}`;
    const ok = await copyToClipboard(url);
    notify(ok ? "تم نسخ رابط القرعة القصير" : "تعذر النسخ");
  }

  async function endTournament() {
    if (ending) return;
    if (
      !confirm(
        "هل تؤكد إنهاء البطولة؟\nبعد التأكيد ستصبح الحالة «منتهية»، ويصعب التراجع عن ذلك.",
      )
    ) {
      return;
    }
    setEnding(true);
    const res = await finishTournament(tournament!.id);
    setEnding(false);
    notify(res.ok ? "تم إنهاء البطولة بنجاح" : res.error || "فشل إنهاء البطولة");
  }

  function createFromRegistrations() {
    const res = createTournamentFromRegistration(tournament!.id);
    if (!res.ok) {
      notify(res.error || "فشل إنشاء البطولة");
      return;
    }
    notify("تم إنشاء البطولة والقرعة — ظاهرة في البطولات");
    if (res.path || res.tournamentId) {
      router.push(res.path || `/tournaments/${res.tournamentId}`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-white"
      >
        <ArrowRight size={16} />
        رجوع
      </button>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--gold)]">
            TOURNAMENT SETTINGS
          </p>
          <h1 className="section-title mt-2 flex items-center gap-2 text-3xl font-bold">
            <Settings2 className="text-[var(--gold)]" size={28} />
            {tournament.registrationOnly
              ? "إعدادات التسجيل"
              : "إعدادات البطولة"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{tournament.name}</p>
        </div>
        {toast ? (
          <p className="text-sm text-[var(--gold-soft)]">{toast}</p>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {!tournament.registrationOnly ? (
          <>
            <Link
              href={tournamentSharePath(tournament)}
              className="btn-ghost !px-3 !py-2 text-sm"
            >
              فتح القرعة
            </Link>
            <button
              type="button"
              className="btn-gold !px-3 !py-2 text-sm"
              onClick={copyTournamentLink}
            >
              نسخ رابط القرعة
            </button>
          </>
        ) : (
          <>
            <Link
              href={registrationSharePath(tournament)}
              className="btn-ghost !px-3 !py-2 text-sm"
            >
              فتح رابط التسجيل
            </Link>
            <button
              type="button"
              className="btn-gold !px-3 !py-2 text-sm"
              onClick={copyRegisterLink}
            >
              نسخ رابط التسجيل
            </button>
          </>
        )}
        {!tournament.registrationOnly ? (
          <button
            type="button"
            className="btn-ghost !px-3 !py-2 text-sm"
            onClick={() => {
              setTournaments((prev) =>
                prev.map((t) =>
                  t.id === tournament.id
                    ? {
                        ...t,
                        status:
                          t.status === "upcoming"
                            ? "ongoing"
                            : t.status === "ongoing"
                              ? "finished"
                              : "upcoming",
                      }
                    : t,
                ),
              );
              notify("تم تحديث حالة البطولة");
            }}
          >
            الحالة:{" "}
            {tournament.status === "ongoing"
              ? "جارية"
              : tournament.status === "upcoming"
                ? "قادمة"
                : "منتهية"}
          </button>
        ) : null}
        {!tournament.registrationOnly &&
        tournament.status !== "finished" ? (
          <button
            type="button"
            disabled={ending}
            className="rounded-full border border-red-400/50 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-60"
            onClick={() => void endTournament()}
          >
            {ending ? "جاري الإنهاء..." : "إنهاء البطولة"}
          </button>
        ) : null}
      </div>

      <section className="panel mb-6 space-y-4 p-5">
        <h2 className="text-lg font-bold">تحكم التسجيل</h2>
        <p className="text-sm text-[var(--muted)]">
          {tournament.registrationOnly
            ? "هذا رابط تسجيل فاضي — افتحه/أغلقة من هنا وانسخ الرابط للقروب."
            : "فتح وإغلاق تسجيل الأسماء لهذه البطولة يتم من هنا فقط."}{" "}
          النوع: {formatLabels[getTournamentFormat(tournament)]} · الحالة:{" "}
          {registrationStatusLabel(tournament)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-gold !px-3 !py-2 text-sm"
            onClick={() => {
              setTournaments((prev) =>
                prev.map((t) =>
                  t.id === tournament.id
                    ? { ...t, registrationOpen: !t.registrationOpen }
                    : t,
                ),
              );
              notify(
                tournament.registrationOpen
                  ? "تم إغلاق التسجيل"
                  : "تم فتح التسجيل — ظاهر في /join",
              );
            }}
          >
            {tournament.registrationOpen ? "إغلاق التسجيل" : "فتح التسجيل"}
          </button>
          <span
            className={`self-center text-xs ${
              isRegistrationOpen(tournament)
                ? "text-[var(--gold-soft)]"
                : "text-zinc-500"
            }`}
          >
            {isRegistrationOpen(tournament)
              ? "ظاهر للأعضاء في /join"
              : "مخفي عن صفحة التسجيل"}
          </span>
        </div>
        <label className="block text-sm">
          <span className="mb-2 block text-[var(--muted)]">
            موعد إغلاق التسجيل التلقائي
            {tournament.registrationEndsAt
              ? ` (الحالي: ${formatRegistrationDeadline(tournament.registrationEndsAt)})`
              : ""}
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="datetime-local"
              className="input-field"
              value={endsAtDraft}
              onChange={(e) => setEndsAtDraft(e.target.value)}
            />
            <button
              type="button"
              className="btn-ghost !px-3 !py-2 text-sm"
              onClick={() => {
                setTournaments((prev) =>
                  prev.map((t) =>
                    t.id === tournament.id
                      ? {
                          ...t,
                          registrationEndsAt: endsAtDraft
                            ? new Date(endsAtDraft).toISOString()
                            : undefined,
                        }
                      : t,
                  ),
                );
                notify(
                  endsAtDraft
                    ? "تم حفظ موعد الإغلاق"
                    : "تم إزالة موعد الإغلاق",
                );
                setEndsAtDraft("");
              }}
            >
              حفظ الموعد
            </button>
          </div>
        </label>

        {tournament.registrationOnly ? (
          <div>
            <p className="mb-2 text-sm text-[var(--muted)]">
              مكان الخانة في الموقع (
              {placementLabels[getRegistrationPlacement(tournament)]})
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["home", "الرئيسية"],
                  ["join", "صفحة التسجيل"],
                  ["both", "الاثنين"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    getRegistrationPlacement(tournament) === value
                      ? "btn-gold !px-3 !py-1.5 text-xs"
                      : "btn-ghost !px-3 !py-1.5 text-xs"
                  }
                  onClick={() => {
                    const placement: RegistrationPlacement = value;
                    setTournaments((prev) =>
                      prev.map((t) =>
                        t.id === tournament.id
                          ? { ...t, registrationPlacement: placement }
                          : t,
                      ),
                    );
                    notify(`مكان الخانة: ${placementLabels[placement]}`);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {tournament.registrationOnly ? (
        <section className="panel mb-6 space-y-4 border-[var(--gold)]/40 p-5">
          {(() => {
            const format = getTournamentFormat(tournament);
            const pending = tournament.pendingRegistrations ?? [];
            const registeredCount =
              pending.length + tournament.participants.length;
            const needed = tournament.size;
            const isFull = registeredCount >= needed;
            const overflow = Math.max(0, registeredCount - needed);
            const unit = format === "duo" ? "فريق" : "لاعب";
            return (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">
                      المسجّلون — جميع الأسماء
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      العدد المطلوب: {needed} {unit} · المسجّل حالياً:{" "}
                      <span className="text-[var(--gold-soft)]">
                        {registeredCount}/{needed}
                      </span>
                      {overflow > 0 ? (
                        <span className="ms-2 text-amber-300">
                          (+{overflow} زيادة)
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10 sm:w-48">
                    <div
                      className={`h-full transition-all ${
                        overflow > 0 ? "bg-amber-400" : "bg-[var(--gold)]"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (registeredCount /
                            Math.max(needed, registeredCount)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <label className="text-sm">
                    <span className="mb-1 block text-[var(--muted)]">
                      توسيع العدد المطلوب
                    </span>
                    <input
                      type="number"
                      min={Math.max(2, registeredCount)}
                      className="input-field w-28"
                      placeholder={String(needed)}
                      value={capacityDraft}
                      onChange={(e) => setCapacityDraft(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-2 text-sm"
                    onClick={async () => {
                      const next = Math.max(
                        2,
                        Number(capacityDraft) || needed + 8,
                      );
                      const res = await updateRegistrationCapacity(
                        tournament.id,
                        next,
                      );
                      notify(
                        res.ok
                          ? `تم تحديث العدد إلى ${next}`
                          : res.error || "فشل التحديث",
                      );
                      if (res.ok) setCapacityDraft("");
                    }}
                  >
                    حفظ العدد
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-2 text-sm"
                    onClick={async () => {
                      const next = Math.max(needed + 8, registeredCount);
                      const res = await updateRegistrationCapacity(
                        tournament.id,
                        next,
                      );
                      notify(
                        res.ok
                          ? `تم توسيع العدد إلى ${next}`
                          : res.error || "فشل التوسيع",
                      );
                    }}
                  >
                    +8 سريع
                  </button>
                </div>

                {pending.length === 0 &&
                tournament.participants.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    لم يُسجَّل أحد بعد؛ ستظهر أسماء المسجّلين هنا فور انضمامهم.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pending.map((req, index) => {
                      const known = players.find(
                        (p) =>
                          p.id === req.userId ||
                          p.username.toLowerCase() ===
                            req.username.toLowerCase(),
                      );
                      const knownMate = req.teammateUsername
                        ? players.find(
                            (p) =>
                              p.id === req.teammateUserId ||
                              p.username.toLowerCase() ===
                                req.teammateUsername!.toLowerCase(),
                          )
                        : undefined;
                      return (
                        <div
                          key={req.id}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-3"
                        >
                          <span className="w-7 shrink-0 text-center font-[family-name:var(--font-display)] text-sm text-[var(--gold)]">
                            #{index + 1}
                          </span>
                          <SafeAvatar
                            src={
                              known?.avatar ||
                              knownMate?.avatar ||
                              "/logo.png"
                            }
                            alt={req.username}
                            size={40}
                          />
                          <div className="min-w-0 flex-1">
                            {format === "duo" && req.teammateUsername ? (
                              <div className="space-y-0.5">
                                <p
                                  dir="ltr"
                                  className="username-ltr font-bold"
                                >
                                  {req.username}
                                </p>
                                <p
                                  dir="ltr"
                                  className="username-ltr text-sm text-[var(--gold-soft)]"
                                >
                                  +{" "}
                                  {[req.teammateUsername, req.teammate2Username]
                                    .filter(Boolean)
                                    .join(" + ")}
                                </p>
                              </div>
                            ) : (
                              <p
                                dir="ltr"
                                className="username-ltr text-lg font-bold"
                              >
                                {req.username}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {formatLabels[format]}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1 text-xs"
                            onClick={() => {
                              setEditError("");
                              setEditingReq(req);
                            }}
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1 text-xs text-red-300"
                            onClick={async () => {
                              const res = await rejectRegistration(
                                tournament.id,
                                req.id,
                              );
                              notify(
                                res.ok
                                  ? "تم حذف التسجيل"
                                  : res.error || "فشل الحذف",
                              );
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isFull ? (
                  <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-[var(--muted)]">
                    يتبقى{" "}
                    <span className="text-[var(--gold-soft)]">
                      {needed - registeredCount}
                    </span>{" "}
                    {unit} لاكتمال العدد الأدنى. التسجيل يبقى مفتوحاً حتى بعد
                    الاكتمال.
                  </p>
                ) : (
                  <div className="space-y-3 rounded-2xl border-2 border-[var(--gold)]/50 bg-[var(--gold-dim)] p-4">
                    <p className="font-bold text-[var(--gold-soft)]">
                      {overflow > 0
                        ? `العدد اكتمل مع زيادة (${registeredCount}/${needed} · +${overflow})`
                        : `اكتمل العدد (${registeredCount}/${needed})`}{" "}
                      — جاهز لإنشاء القرعة
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      سيُنشأ بطولة كاملة + شجرة قرعة لكل المسجّلين
                      {overflow > 0 ? " بما فيهم الزيادة" : ""}، ويُقرّب حجم
                      الشجرة لأقرب قوة 2. يظهر في «البطولات» ويُغلق رابط
                      التسجيل.
                    </p>
                    <button
                      type="button"
                      className="btn-gold w-full !py-3 text-base"
                      onClick={createFromRegistrations}
                    >
                      <Shuffle size={18} />
                      إنشاء قرعة وبطولة كاملة
                      {overflow > 0 ? ` (${registeredCount} مشارك)` : ""}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </section>
      ) : (
      <section className="panel mb-6 space-y-4 p-5">
        <h2 className="text-lg font-bold">
          المسجّلون (
          {(tournament.pendingRegistrations ?? []).length})
        </h2>
        <p className="text-sm text-[var(--muted)]">
          اللي سجّلوا يظهرون هنا — أضفهم للقائمة أو ارفض.
        </p>
        {(tournament.pendingRegistrations ?? []).length === 0 ? (
          <p className="text-sm text-[var(--muted)]">لا تسجيلات جديدة بعد.</p>
        ) : (
          <div className="space-y-2">
            {(tournament.pendingRegistrations ?? []).map((req) => {
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
              const label = req.teammateUsername
                ? [req.username, req.teammateUsername, req.teammate2Username]
                    .filter(Boolean)
                    .join(" + ")
                : req.username;
              return (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2">
                    <SafeAvatar
                      src={known?.avatar || knownMate?.avatar || "/logo.png"}
                      alt={label}
                      size={32}
                    />
                    <div>
                      <p dir="ltr" className="username-ltr font-semibold">
                        {label}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                      onClick={() => {
                        setEditError("");
                        setEditingReq(req);
                      }}
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      className="btn-gold !px-3 !py-1.5 text-xs"
                      onClick={async () => {
                        const res = await approveRegistration(
                          tournament.id,
                          req.id,
                        );
                        notify(
                          res.ok
                            ? `تمت إضافة ${label}`
                            : res.error || "فشل",
                        );
                      }}
                    >
                      إضافة
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !px-3 !py-1.5 text-xs text-red-300"
                      onClick={async () => {
                        const res = await rejectRegistration(
                          tournament.id,
                          req.id,
                        );
                        notify(
                          res.ok ? "تم رفض التسجيل" : res.error || "فشل الحذف",
                        );
                      }}
                    >
                      رفض
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {!tournament.registrationOnly ? (
      <>
      <section className="panel mb-6 space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-[var(--gold)]" />
          <h2 className="text-lg font-bold">تأهيل الفائز</h2>
        </div>
        <p className="text-sm text-[var(--muted)]">
          اللعب لحد 5: اكتب نتيجة الطرفين (الخانات فارغة) ثم أهّل. في بطولة
          التيم يتأهل التيم كامل (الشخصين معاً). تقدر أيضاً من صفحة الشجرة.
        </p>

        {openMatches.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            لا مباريات جاهزة للتأهيل حالياً (انتظر اكتمال الطرفين أو انتهت كل
            المباريات).
          </p>
        ) : (
          <div className="space-y-3">
            {openMatches.map((m) => {
              const e1 = entryLabel(tournament, m.player1Id, getPlayer);
              const e2 = entryLabel(tournament, m.player2Id, getPlayer);
              const sc = scores[m.id] ?? { s1: "", s2: "" };
              const isDuo = getTournamentFormat(tournament) === "duo";
              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="mb-3 text-xs text-[var(--gold)]">
                    {roundLabel(m.round, totalRounds)}
                    {isDuo ? " · تيم ضد تيم" : " · فردي"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
                    <div className="flex items-center gap-2">
                      <SafeAvatar
                        src={e1?.avatar || "/logo.png"}
                        alt={e1?.label || ""}
                        size={28}
                      />
                      <span
                        dir="ltr"
                        className="username-ltr text-sm font-semibold"
                      >
                        {e1?.label ?? "—"}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      placeholder="—"
                      value={sc.s1}
                      onChange={(e) => setScore(m.id, "s1", e.target.value)}
                      className="input-field !w-16 text-center"
                    />
                    <div className="flex items-center gap-2 sm:justify-end">
                      <span
                        dir="ltr"
                        className="username-ltr text-sm font-semibold"
                      >
                        {e2?.label ?? "—"}
                      </span>
                      <SafeAvatar
                        src={e2?.avatar || "/logo.png"}
                        alt={e2?.label || ""}
                        size={28}
                      />
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      placeholder="—"
                      value={sc.s2}
                      onChange={(e) => setScore(m.id, "s2", e.target.value)}
                      className="input-field !w-16 text-center"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-gold mt-3 w-full !py-2 text-sm"
                    onClick={() => void advanceWinner(m.id)}
                  >
                    {isDuo
                      ? "تأهيل التيم الفائز حسب النتيجة"
                      : "تأهيل الفائز حسب النتيجة"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel mb-6 space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Shuffle size={18} className="text-[var(--gold)]" />
          <h2 className="text-lg font-bold">تعديل القرعة</h2>
        </div>
        <p className="text-sm text-[var(--muted)]">
          أعد سحب القرعة عشوائياً أو بدّل مكان{" "}
          {getTournamentFormat(tournament) === "duo" ? "فريقين" : "لاعبين"} في
          الدور الأول.
        </p>

        <button
          type="button"
          className="btn-gold w-full disabled:opacity-70"
          disabled={redrawing || tournament.participants.length < 2}
          onClick={() => void redraw()}
        >
          <Shuffle size={16} />
          {redrawing ? "جاري سحب القرعة..." : "إعادة سحب القرعة"}
        </button>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-2 block text-[var(--muted)]">
              {getTournamentFormat(tournament) === "duo"
                ? "الفريق الأول"
                : "اللاعب الأول"}
            </span>
            <select
              className="input-field"
              value={swapA}
              onChange={(e) => setSwapA(e.target.value)}
            >
              <option value="">اختر</option>
              {tournament.participants.map((id) => (
                <option key={id} value={id}>
                  {entryLabel(tournament, id, getPlayer)?.label ?? id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-[var(--muted)]">
              {getTournamentFormat(tournament) === "duo"
                ? "الفريق الثاني"
                : "اللاعب الثاني"}
            </span>
            <select
              className="input-field"
              value={swapB}
              onChange={(e) => setSwapB(e.target.value)}
            >
              <option value="">اختر</option>
              {tournament.participants.map((id) => (
                <option key={id} value={id}>
                  {entryLabel(tournament, id, getPlayer)?.label ?? id}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className="btn-ghost w-full" onClick={swapPlayers}>
          تبديل مكانهما في القرعة
        </button>

        <div className="space-y-2 border-t border-white/5 pt-4">
          <p className="text-xs text-[var(--muted)]">مواجهات الدور الأول</p>
          {round1Slots.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2 text-sm"
            >
              <span>
                {entryLabel(tournament, m.player1Id, getPlayer)?.label ?? "فاضي"}
              </span>
              <span className="text-[var(--muted)]">ضد</span>
              <span>
                {entryLabel(tournament, m.player2Id, getPlayer)?.label ?? "فاضي"}
              </span>
            </div>
          ))}
        </div>
      </section>
      </>
      ) : null}

      {!tournament.registrationOnly && tournament.status !== "finished" ? (
        <section className="panel mb-6 space-y-3 border border-red-400/30 bg-red-500/5 p-5">
          <h2 className="text-lg font-bold text-red-300">إنهاء البطولة</h2>
          <p className="text-sm text-[var(--muted)]">
            لما تخلص البطولة اضغط الزر الأحمر. بيطلب منك تأكيد قبل الإنهاء.
          </p>
          <button
            type="button"
            disabled={ending}
            className="w-full rounded-full border border-red-400/60 bg-red-500/20 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/30 disabled:opacity-60"
            onClick={() => void endTournament()}
          >
            {ending ? "جاري الإنهاء..." : "إنهاء البطولة"}
          </button>
        </section>
      ) : null}

      {tournament.registrationOnly ? (
        <section className="panel mb-6 space-y-3 border border-red-400/30 bg-red-500/5 p-5">
          <h2 className="text-lg font-bold text-red-300">حذف رابط التسجيل</h2>
          <p className="text-sm text-[var(--muted)]">
            يحذف الرابط وجميع المسجّلين فيه من الموقع، ولا يمكن استرجاعه بعد الحذف.
          </p>
          <button
            type="button"
            className="w-full rounded-full border border-red-400/60 bg-red-500/20 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/30"
            onClick={async () => {
              if (
                !confirm(
                  "هل تؤكد حذف رابط التسجيل؟\nسيُحذف الرابط وجميع الأسماء المسجّلة فيه نهائياً.",
                )
              ) {
                return;
              }
              const res = await deleteRegistrationLink(tournament.id);
              if (!res.ok) {
                notify(res.error || "فشل الحذف");
                return;
              }
              notify("تم حذف رابط التسجيل");
              router.push("/tournaments");
            }}
          >
            حذف رابط التسجيل
          </button>
        </section>
      ) : null}

      {editingReq ? (
        <PendingEditDialog
          key={editingReq.id}
          open
          tournament={tournament}
          request={editingReq}
          players={players}
          loading={editLoading}
          error={editError}
          onClose={() => {
            if (editLoading) return;
            setEditingReq(null);
            setEditError("");
          }}
          onSave={(input) => {
            void (async () => {
              setEditLoading(true);
              setEditError("");
              const res = await updatePendingRegistration(
                tournament.id,
                editingReq.id,
                input,
              );
              setEditLoading(false);
              if (!res.ok) {
                setEditError(res.error || "فشل التعديل");
                return;
              }
              setEditingReq(null);
              notify("تم حفظ التعديل — يدخل القرعة بهذه الأسماء");
            })();
          }}
        />
      ) : null}
    </div>
  );
}
