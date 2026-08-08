"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { Bracket } from "@/components/tournaments/Bracket";
import { BracketSlotDialog } from "@/components/tournaments/BracketSlotDialog";
import { MatchScoreDialog } from "@/components/tournaments/MatchScoreDialog";
import { StatusBadge } from "@/components/ui/Badge";
import { Countdown } from "@/components/ui/Countdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShareButton } from "@/components/ui/ShareButton";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { UsernamePicker } from "@/components/ui/UsernamePicker";
import { useStore } from "@/context/StoreContext";
import { gameLabels } from "@/lib/data";
import {
  findTournamentByShareRef,
  formatRegistrationDeadline,
  isRegistrationOpen,
  registrationSharePath,
  registrationStatusLabel,
  tournamentSharePath,
} from "@/lib/registration";
import { isStaff } from "@/lib/roles";
import {
  entryLabel,
  formatLabels,
  getTournamentFormat,
  isUserInTournament,
} from "@/lib/tournament-format";
import { formatDate } from "@/lib/utils";

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    tournaments,
    getPlayer,
    ready,
    user,
    players,
    submitRegistration,
    setTournaments,
    recordMatchResult,
    assignBracketSlot,
    advanceMatchWinner,
    revertMatchWinner,
  } = useStore();
  const me = players.find((p) => p.id === user?.id);
  const staff = isStaff(me?.role ?? user?.role);
  const [joinUsername, setJoinUsername] = useState("");
  const [teammateUsername, setTeammateUsername] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [joinError, setJoinError] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [scoreMatchId, setScoreMatchId] = useState<string | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [slotEdit, setSlotEdit] = useState<{
    matchId: string;
    side: 1 | 2;
    advanceAfter: boolean;
  } | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [choiceMenu, setChoiceMenu] = useState<{
    matchId: string;
    side: 1 | 2;
    mode: "score" | "bye" | "revert" | "advanced";
    /** مباراة المصدر عند mode=advanced */
    sourceMatchId?: string;
  } | null>(null);
  const [byeLoading, setByeLoading] = useState(false);
  const [revertLoading, setRevertLoading] = useState(false);
  const [bracketMsg, setBracketMsg] = useState("");
  const [, setTick] = useState(0);
  const tournament = findTournamentByShareRef(tournaments, params.id);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (searchParams.get("register") !== "1") return;
    const el = document.getElementById("register");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams, tournament?.id]);

  useEffect(() => {
    if (!user?.username) return;
    setJoinUsername((prev) => prev || user.username);
  }, [user?.username]);

  useEffect(() => {
    if (!tournament?.registrationEndsAt || !tournament.registrationOpen) return;
    if (new Date(tournament.registrationEndsAt).getTime() > Date.now()) return;
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === tournament.id ? { ...t, registrationOpen: false } : t,
      ),
    );
  }, [tournament, setTournaments]);

  useEffect(() => {
    if (!tournament?.registrationOnly) return;
    router.replace(registrationSharePath(tournament));
  }, [tournament, router]);

  // رابط القرعة القصير /t/xxxx بدل /tournaments/t-1723…
  useEffect(() => {
    if (!tournament || tournament.registrationOnly) return;
    const short = tournamentSharePath(tournament);
    if (!short.startsWith("/t/")) return;
    if (pathname === short) return;
    // من المسار الطويل أو من /t بمعرف قديم → الثابت القصير
    if (
      pathname?.startsWith("/tournaments/") ||
      (pathname?.startsWith("/t/") && pathname !== short)
    ) {
      router.replace(short);
    }
  }, [tournament, pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
        جاري التحميل...
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="البطولة غير موجودة"
          description="ربما تم حذفها أو الرابط غير صحيح."
          actionHref="/tournaments"
          actionLabel="كل البطولات"
        />
      </div>
    );
  }

  if (tournament.registrationOnly) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
        جاري التحويل لصفحة التسجيل...
      </div>
    );
  }

  const regOpen = isRegistrationOpen(tournament);
  const format = getTournamentFormat(tournament);
  const championEntry = entryLabel(tournament, tournament.championId, getPlayer);
  const runnerUpEntry = entryLabel(tournament, tournament.runnerUpId, getPlayer);
  const topScorer = getPlayer(tournament.topScorerId);
  const bestPlayer = getPlayer(tournament.bestPlayerId);
  const bestGk = getPlayer(tournament.bestGoalkeeperId);
  const finishedMatches = tournament.bracket.filter(
    (m) => m.winnerId && m.score1 != null && m.player1Id && m.player2Id,
  );
  const alreadyJoined = isUserInTournament(tournament, user?.id);
  const pendingForMe = (tournament.pendingRegistrations ?? []).some((r) => {
    const names = [r.username, r.teammateUsername]
      .filter(Boolean)
      .map((x) => x!.toLowerCase());
    const typed = (joinUsername || user?.username || "").trim().toLowerCase();
    if (typed && names.includes(typed)) return true;
    if (r.userId && r.userId === user?.id) return true;
    if (r.teammateUserId && r.teammateUserId === user?.id) return true;
    return false;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="panel relative mb-10 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={tournament.image || "/logo.png"}
            alt={tournament.name}
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#16161c] via-[#16161c]/95 to-[#16161c]/80" />
        </div>
        <div className="relative p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={tournament.status} />
              <span className="text-sm text-[var(--gold)]">
                {gameLabels[tournament.game]} · {formatLabels[format]} ·{" "}
                {format === "duo" ? `${tournament.size} فرق` : `دوري ${tournament.size}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {staff && tournament.status !== "finished" ? (
                <Link
                  href={`/tournaments/${tournament.id}/settings`}
                  className="btn-gold !px-3 !py-2 text-sm"
                >
                  <Settings2 size={16} />
                  إعدادات البطولة
                </Link>
              ) : null}
              <ShareButton path={tournamentSharePath(tournament)} />
            </div>
          </div>
          <h1 className="section-title mt-4 text-3xl font-bold sm:text-4xl">
            {tournament.name}
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            {tournament.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-zinc-300">
            <span>البداية: {formatDate(tournament.startDate)}</span>
            <span>النهاية: {formatDate(tournament.endDate)}</span>
            <span>
              {tournament.participants.length}/{tournament.size}{" "}
              {format === "duo" ? "فريق" : "مشارك"}
            </span>
            <span>التسجيل: {registrationStatusLabel(tournament)}</span>
            {tournament.registrationEndsAt ? (
              <span>
                يغلق: {formatRegistrationDeadline(tournament.registrationEndsAt)}
              </span>
            ) : null}
            {tournament.prize ? <span>الجائزة: {tournament.prize}</span> : null}
          </div>
        </div>
      </div>

      <section id="register" className="panel mb-10 scroll-mt-24 p-5 sm:p-6">
        <h2 className="section-title text-xl font-bold sm:text-2xl">
          تسجيل هنا
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {format === "duo"
            ? "بطولة جماعية (Duo): أدخل يوزرك يميناً ويوزر شريكك يساراً، أو اخترهما من قائمة أعضاء الموقع. بعد موافقة المشرف تُضافان كفريق."
            : "بطولة فردية: أدخل يوزرك أو اختره من قائمة أعضاء الموقع. بعد موافقة المشرف تُضاف للبطولة."}
        </p>

        {tournament.registrationEndsAt ? (
          <div className="mt-4 max-w-md">
            <p className="mb-2 text-xs text-[var(--muted)]">
              العد التنازلي لإغلاق التسجيل
            </p>
            {regOpen ? (
              <Countdown date={tournament.registrationEndsAt} />
            ) : (
              <p className="text-sm text-red-300">انتهى وقت التسجيل</p>
            )}
          </div>
        ) : null}

        {alreadyJoined ? (
          <p className="mt-4 text-sm text-[var(--gold-soft)]">
            أنت مضاف في هذه البطولة ✓
          </p>
        ) : pendingForMe ? (
          <p className="mt-4 text-sm text-[var(--gold-soft)]">
            تم استلام تسجيلك، وبانتظار إضافة المشرف لك إلى البطولة.
          </p>
        ) : !regOpen ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            {registrationStatusLabel(tournament)}. لا يمكن التسجيل الآن.
          </p>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoadingJoin(true);
              const name = joinUsername.trim() || user?.username || "";
              const res = await submitRegistration(tournament.id, {
                username: name,
                teammateUsername:
                  format === "duo" ? teammateUsername : undefined,
              });
              setJoinError(!res.ok);
              setJoinMsg(
                res.ok
                  ? format === "duo"
                    ? "تم تسجيل الفريق لدى المشرفين، وبانتظار الإضافة."
                    : "تم تسجيل يوزرك لدى المشرفين، وبانتظار الإضافة."
                  : res.error || "",
              );
              setLoadingJoin(false);
            }}
          >
            {format === "duo" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <UsernamePicker
                  label="يمين — يوزرك"
                  value={joinUsername}
                  onChange={setJoinUsername}
                  players={players}
                  placeholder="يوزرك في Plato"
                />
                <UsernamePicker
                  label="يسار — يوزر شريكك"
                  value={teammateUsername}
                  onChange={setTeammateUsername}
                  players={players}
                  placeholder="يوزر الشريك"
                />
              </div>
            ) : (
              <UsernamePicker
                label="يوزر Plato"
                value={joinUsername}
                onChange={setJoinUsername}
                players={players}
              />
            )}
            <button
              type="submit"
              disabled={loadingJoin}
              className="btn-gold disabled:opacity-70"
            >
              {loadingJoin
                ? "جاري..."
                : format === "duo"
                  ? "تسجيل الفريق"
                  : "تسجيل"}
            </button>
          </form>
        )}
        {joinMsg ? (
          <p
            className={`mt-3 text-sm ${
              joinError ? "text-red-300" : "text-[var(--gold-soft)]"
            }`}
          >
            {joinMsg}
          </p>
        ) : null}

        {staff && (tournament.pendingRegistrations?.length ?? 0) > 0 ? (
          <p className="mt-4 text-sm text-[var(--gold)]">
            {tournament.pendingRegistrations!.length} تسجيل بانتظارك —{" "}
            <Link
              href={`/tournaments/${tournament.id}/settings`}
              className="underline"
            >
              افتح الإعدادات لإضافتهم
            </Link>
          </p>
        ) : null}
      </section>

      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="section-title text-2xl font-bold">شجرة البطولة</h2>
          {staff && !tournament.registrationOnly ? (
            <p className="text-xs text-[var(--muted)]">
              مشرف: تعبئة · نتيجة · ولو أهّلت بالغلط اضغط للتراجع خطوة
            </p>
          ) : null}
        </div>
        {bracketMsg ? (
          <p className="mb-3 text-sm text-[var(--gold-soft)]">{bracketMsg}</p>
        ) : null}
        <div className="panel p-3 sm:p-6">
          <Bracket
            matches={tournament.bracket}
            getEntry={(id) => entryLabel(tournament, id, getPlayer)}
            staffMode={staff && !tournament.registrationOnly}
            activeMatchId={scoreMatchId || slotEdit?.matchId || null}
            onSlotClick={(matchId, side, kind, sourceMatchId) => {
              setSlotError("");
              setScoreError("");
              if (kind === "revert") {
                setChoiceMenu({ matchId, side, mode: "revert" });
                return;
              }
              if (kind === "advanced") {
                const match = tournament.bracket.find((m) => m.id === matchId);
                const isBye = Boolean(
                  match &&
                    ((match.player1Id && !match.player2Id) ||
                      (!match.player1Id && match.player2Id)) &&
                    !match.winnerId,
                );
                // متأهل لوحده في الدور التالي → خلّه يقدر يتأهل مو بس يرجع
                if (isBye) {
                  setChoiceMenu({ matchId, side, mode: "bye" });
                  return;
                }
                setChoiceMenu({
                  matchId,
                  side,
                  mode: "advanced",
                  sourceMatchId,
                });
                return;
              }
              if (kind === "empty") {
                setSlotEdit({
                  matchId,
                  side,
                  advanceAfter: false,
                });
                return;
              }
              if (kind === "filled") {
                // طرف واحد بدون خصم → قائمة: تأهيل مباشر / استبدال / تأهيل جديد
                setChoiceMenu({ matchId, side, mode: "bye" });
                return;
              }
              // طرفين جاهزين → نتيجة / استبدال / تأهيل خارجي
              setChoiceMenu({ matchId, side, mode: "score" });
            }}
          />
        </div>

        {choiceMenu ? (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center">
            <button
              type="button"
              className="absolute inset-0"
              aria-label="إغلاق"
              onClick={() => {
                if (byeLoading || revertLoading) return;
                setChoiceMenu(null);
              }}
            />
            <div className="relative z-10 w-full max-w-sm space-y-3 rounded-2xl border border-[var(--gold)]/30 bg-[#121218] p-5">
              <h3 className="text-lg font-bold">ماذا تريد؟</h3>
              {choiceMenu.mode === "revert" ||
              choiceMenu.mode === "advanced" ? (
                <>
                  <p className="text-sm text-[var(--muted)]">
                    ترجع التأهيل خطوة للخلف — الطرف يرجع لمكانه وتتلغى
                    النتيجة.
                  </p>
                  <button
                    type="button"
                    className="btn-gold w-full"
                    disabled={revertLoading}
                    onClick={() => {
                      const targetId =
                        choiceMenu.mode === "advanced"
                          ? choiceMenu.sourceMatchId || choiceMenu.matchId
                          : choiceMenu.matchId;
                      void (async () => {
                        setRevertLoading(true);
                        const res = await revertMatchWinner({
                          tournamentId: tournament.id,
                          matchId: targetId,
                        });
                        setRevertLoading(false);
                        if (!res.ok) {
                          setBracketMsg(res.error || "فشل الإرجاع");
                          window.setTimeout(() => setBracketMsg(""), 4000);
                          return;
                        }
                        setChoiceMenu(null);
                        setBracketMsg("تم إرجاع التيم/اللاعب خطوة للخلف");
                        window.setTimeout(() => setBracketMsg(""), 3000);
                      })();
                    }}
                  >
                    {revertLoading
                      ? "جاري الإرجاع..."
                      : "↩ إرجاع خطوة للخلف"}
                  </button>
                  {choiceMenu.mode === "advanced" ? (
                    <button
                      type="button"
                      className="btn-ghost w-full"
                      disabled={revertLoading}
                      onClick={() => {
                        setSlotEdit({
                          matchId: choiceMenu.matchId,
                          side: choiceMenu.side,
                          advanceAfter: false,
                        });
                        setChoiceMenu(null);
                      }}
                    >
                      استبدال هذا الطرف
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="w-full text-sm text-[var(--muted)]"
                    disabled={revertLoading}
                    onClick={() => setChoiceMenu(null)}
                  >
                    إلغاء
                  </button>
                </>
              ) : (
                <>
                  {choiceMenu.mode === "bye" ? (
                    <button
                      type="button"
                      className="btn-gold w-full"
                      disabled={byeLoading}
                      onClick={() => {
                        const match = tournament.bracket.find(
                          (m) => m.id === choiceMenu.matchId,
                        );
                        const winnerId =
                          choiceMenu.side === 1
                            ? match?.player1Id
                            : match?.player2Id;
                        if (!winnerId) return;
                        void (async () => {
                          setByeLoading(true);
                          const res = await advanceMatchWinner({
                            tournamentId: tournament.id,
                            matchId: choiceMenu.matchId,
                            winnerId,
                          });
                          setByeLoading(false);
                          if (!res.ok) {
                            setBracketMsg(res.error || "فشل التأهيل");
                            window.setTimeout(() => setBracketMsg(""), 4000);
                            return;
                          }
                          setChoiceMenu(null);
                          setBracketMsg("تم التأهيل مباشرة بدون خصم");
                          window.setTimeout(() => setBracketMsg(""), 3000);
                        })();
                      }}
                    >
                      {byeLoading
                        ? "جاري التأهيل..."
                        : "تأهيل مباشرة (بدون خصم)"}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-gold w-full"
                        disabled={byeLoading}
                        onClick={() => {
                          const match = tournament.bracket.find(
                            (m) => m.id === choiceMenu.matchId,
                          );
                          const winnerId =
                            choiceMenu.side === 1
                              ? match?.player1Id
                              : match?.player2Id;
                          if (!winnerId) return;
                          void (async () => {
                            setByeLoading(true);
                            const res = await advanceMatchWinner({
                              tournamentId: tournament.id,
                              matchId: choiceMenu.matchId,
                              winnerId,
                            });
                            setByeLoading(false);
                            if (!res.ok) {
                              setBracketMsg(res.error || "فشل التأهيل");
                              window.setTimeout(
                                () => setBracketMsg(""),
                                4000,
                              );
                              return;
                            }
                            setChoiceMenu(null);
                            setBracketMsg("تم تأهيل الطرف للجولة التالية");
                            window.setTimeout(() => setBracketMsg(""), 3000);
                          })();
                        }}
                      >
                        {byeLoading
                          ? "جاري التأهيل..."
                          : "تأهيل هذا الطرف"}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost w-full"
                        disabled={byeLoading}
                        onClick={() => {
                          setScoreMatchId(choiceMenu.matchId);
                          setChoiceMenu(null);
                        }}
                      >
                        تسجيل نتيجة ثم تأهيل
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn-ghost w-full"
                    disabled={byeLoading}
                    onClick={() => {
                      setSlotEdit({
                        matchId: choiceMenu.matchId,
                        side: choiceMenu.side,
                        advanceAfter: false,
                      });
                      setChoiceMenu(null);
                    }}
                  >
                    استبدال هذا الطرف
                  </button>
                  <button
                    type="button"
                    className="btn-ghost w-full"
                    disabled={byeLoading}
                    onClick={() => {
                      setSlotEdit({
                        matchId: choiceMenu.matchId,
                        side: choiceMenu.side,
                        advanceAfter: true,
                      });
                      setChoiceMenu(null);
                    }}
                  >
                    تأهيل يوزر/تيم جديد (حتى لو مو بالقرعة)
                  </button>
                  <button
                    type="button"
                    className="w-full text-sm text-[var(--muted)]"
                    disabled={byeLoading}
                    onClick={() => setChoiceMenu(null)}
                  >
                    إلغاء
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}

        <BracketSlotDialog
          open={Boolean(slotEdit)}
          title={
            slotEdit?.advanceAfter
              ? format === "duo"
                ? "تأهيل تيم للخانة (بحث أو كتابة)"
                : "تأهيل لاعب للخانة (بحث أو كتابة)"
              : format === "duo"
                ? "تعبئة / استبدال التيم"
                : "تعبئة / استبدال اللاعب"
          }
          mode={format === "duo" ? "duo" : "solo"}
          players={players}
          loading={slotLoading}
          error={slotError}
          onClose={() => {
            if (slotLoading) return;
            setSlotEdit(null);
            setSlotError("");
          }}
          onSubmitSolo={(username) => {
            if (!slotEdit) return;
            void (async () => {
              setSlotLoading(true);
              setSlotError("");
              const res = await assignBracketSlot({
                tournamentId: tournament.id,
                matchId: slotEdit.matchId,
                side: slotEdit.side,
                username,
                advanceAfter: slotEdit.advanceAfter,
              });
              setSlotLoading(false);
              if (!res.ok) {
                setSlotError(res.error || "فشل");
                return;
              }
              setSlotEdit(null);
              setBracketMsg(
                slotEdit.advanceAfter
                  ? "تم وضع اللاعب وتأهيله"
                  : "تم تحديث الخانة",
              );
              window.setTimeout(() => setBracketMsg(""), 3000);
            })();
          }}
          onSubmitDuo={(u1, u2) => {
            if (!slotEdit) return;
            void (async () => {
              setSlotLoading(true);
              setSlotError("");
              const res = await assignBracketSlot({
                tournamentId: tournament.id,
                matchId: slotEdit.matchId,
                side: slotEdit.side,
                username: u1,
                teammateUsername: u2,
                advanceAfter: slotEdit.advanceAfter,
              });
              setSlotLoading(false);
              if (!res.ok) {
                setSlotError(res.error || "فشل");
                return;
              }
              setSlotEdit(null);
              setBracketMsg(
                slotEdit.advanceAfter
                  ? "تم وضع التيم وتأهيله"
                  : "تم تحديث خانة التيم",
              );
              window.setTimeout(() => setBracketMsg(""), 3000);
            })();
          }}
        />

        {(() => {
          const match = tournament.bracket.find((m) => m.id === scoreMatchId);
          if (!match?.player1Id || !match.player2Id) return null;
          const e1 = entryLabel(tournament, match.player1Id, getPlayer);
          const e2 = entryLabel(tournament, match.player2Id, getPlayer);
          return (
            <MatchScoreDialog
              open={Boolean(scoreMatchId)}
              title={
                format === "duo"
                  ? "نتيجة مباراة التيمين"
                  : "نتيجة المباراة"
              }
              unitLabel={format === "duo" ? "تيم" : "لاعب"}
              side1={{
                id: match.player1Id,
                label: e1?.label || "طرف 1",
                avatar: e1?.avatar,
              }}
              side2={{
                id: match.player2Id,
                label: e2?.label || "طرف 2",
                avatar: e2?.avatar,
              }}
              loading={scoreLoading}
              error={scoreError}
              onClose={() => {
                if (scoreLoading) return;
                setScoreMatchId(null);
                setScoreError("");
              }}
              onSubmit={(score1, score2) => {
                void (async () => {
                  setScoreLoading(true);
                  setScoreError("");
                  const res = await recordMatchResult({
                    tournamentId: tournament.id,
                    matchId: match.id,
                    score1,
                    score2,
                  });
                  setScoreLoading(false);
                  if (!res.ok) {
                    setScoreError(res.error || "فشل التأهيل");
                    return;
                  }
                  setScoreMatchId(null);
                  setBracketMsg(
                    format === "duo"
                      ? "تم تأهيل التيم للجولة التالية"
                      : "تم تأهيل اللاعب للجولة التالية",
                  );
                  window.setTimeout(() => setBracketMsg(""), 3000);
                })();
              }}
            />
          );
        })()}
      </section>

      {(championEntry || bestPlayer || topScorer) && (
        <section className="mb-12">
          <h2 className="section-title mb-4 text-2xl font-bold">أبرز التتويجات</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "البطل", entry: championEntry },
              { label: "الوصيف", entry: runnerUpEntry },
              {
                label: "الهداف",
                entry: topScorer
                  ? {
                      label: topScorer.username,
                      avatar: topScorer.avatar,
                      href: `/players/${topScorer.id}`,
                    }
                  : undefined,
              },
              {
                label: "أفضل لاعب",
                entry: bestPlayer
                  ? {
                      label: bestPlayer.username,
                      avatar: bestPlayer.avatar,
                      href: `/players/${bestPlayer.id}`,
                    }
                  : undefined,
              },
              {
                label: "أفضل حارس",
                entry: bestGk
                  ? {
                      label: bestGk.username,
                      avatar: bestGk.avatar,
                      href: `/players/${bestGk.id}`,
                    }
                  : undefined,
              },
            ]
              .filter((x) => x.entry)
              .map((item) => {
                const body = (
                  <>
                    <SafeAvatar
                      src={item.entry!.avatar || "/logo.png"}
                      alt={item.entry!.label}
                      size={56}
                      className="mx-auto"
                    />
                    <p className="mt-3 text-xs text-[var(--gold)]">{item.label}</p>
                    <p className="mt-1 font-bold">{item.entry!.label}</p>
                  </>
                );
                return item.entry!.href ? (
                  <Link
                    key={item.label}
                    href={item.entry!.href}
                    className="panel panel-hover p-4 text-center"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={item.label} className="panel p-4 text-center">
                    {body}
                  </div>
                );
              })}
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="section-title mb-4 text-2xl font-bold">نتائج المباريات</h2>
        {finishedMatches.length === 0 ? (
          <EmptyState
            title="لا نتائج بعد"
            description="ستظهر النتائج هنا بعد تسجيلها من لوحة المشرفين."
          />
        ) : (
          <div className="space-y-3">
            {finishedMatches.map((match) => {
              const e1 = entryLabel(tournament, match.player1Id, getPlayer);
              const e2 = entryLabel(tournament, match.player2Id, getPlayer);
              const winner = entryLabel(tournament, match.winnerId, getPlayer);
              return (
                <div
                  key={match.id}
                  className="panel flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      {e1?.label} ضد {e2?.label}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      الفائز: {winner?.label}
                    </p>
                  </div>
                  <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--gold-soft)]">
                    {match.score1} - {match.score2}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-4 text-2xl font-bold">المشاركون</h2>
        {tournament.participants.length === 0 ? (
          <EmptyState
            title="لا مشاركين بعد"
            description="يمكن للمشرف إضافة اللاعبين عند إنشاء البطولة أو لاحقاً."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tournament.participants.map((pid) => {
              const player = getPlayer(pid);
              if (!player) return null;
              return (
                <Link
                  key={pid}
                  href={`/players/${pid}`}
                  className="panel panel-hover flex items-center gap-3 p-3"
                >
                  <SafeAvatar
                    src={player.avatar}
                    alt={player.username}
                    size={40}
                  />
                  <div>
                    <p dir="ltr" className="username-ltr font-semibold">
                      {player.username}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{player.rank}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
