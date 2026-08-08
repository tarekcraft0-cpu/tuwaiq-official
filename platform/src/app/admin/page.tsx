"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Megaphone,
  Shield,
  Trophy,
  Users,
  Vote,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { BRACKET_SIZE_OPTIONS, createBracket } from "@/lib/bracket";
import {
  formatRegistrationDeadline,
  isRegistrationOpen,
  registrationSharePath,
  registrationStatusLabel,
} from "@/lib/registration";
import {
  getRegistrationPlacement,
  placementLabels,
} from "@/lib/registration-placement";
import { isOwner, isStaff, roleLabel } from "@/lib/roles";
import { entryLabel, formatLabels, getTournamentFormat } from "@/lib/tournament-format";
import type {
  RegistrationPlacement,
  TournamentFormat,
  TournamentStatus,
} from "@/lib/types";
import { copyToClipboard } from "@/lib/utils";

type Tab =
  | "overview"
  | "tournaments"
  | "registrations"
  | "votes"
  | "news"
  | "users"
  | "achievements";

export default function AdminPage() {
  const {
    user,
    players,
    tournaments,
    votes,
    news,
    setTournaments,
    setVotes,
    setNews,
    setPlayers,
    createTournament,
    createRegistrationLink,
    deleteRegistrationLink,
    recordMatchResult,
    resetStore,
    addNotification,
    storageMode,
  } = useStore();

  const [tab, setTab] = useState<Tab>("registrations");
  const [toast, setToast] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const liveUser = players.find((p) => p.id === user?.id);
  const liveRole = liveUser?.role ?? user?.role;
  const [tournamentForm, setTournamentForm] = useState({
    name: "",
    game: "football",
    startDate: "",
    endDate: "",
    status: "upcoming" as TournamentStatus,
    format: "solo" as TournamentFormat,
    size: 16,
    customSize: "",
    prize: "",
    description: "",
  });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [draftTeams, setDraftTeams] = useState<
    { player1Id: string; player2Id: string }[]
  >([]);
  const [teamDraft, setTeamDraft] = useState({ p1: "", p2: "" });
  const [voteQuestion, setVoteQuestion] = useState("");
  const [voteOptions, setVoteOptions] = useState("نعم\nلا");
  const [newsForm, setNewsForm] = useState({
    title: "",
    content: "",
    category: "announcement",
  });
  const [achievementForm, setAchievementForm] = useState({
    playerId: "",
    title: "",
    icon: "🏆",
  });
  const [scoreForm, setScoreForm] = useState({
    tournamentId: "",
    matchId: "",
    score1: "",
    score2: "",
  });
  const [regLinkForm, setRegLinkForm] = useState({
    title: "",
    format: "solo" as TournamentFormat,
    size: 32,
    placement: "both" as RegistrationPlacement,
    registrationEndsAt: "",
  });
  const [lastRegLink, setLastRegLink] = useState("");

  const realTournaments = useMemo(
    () => tournaments.filter((t) => !t.registrationOnly),
    [tournaments],
  );
  const registrationLinks = useMemo(
    () => tournaments.filter((t) => t.registrationOnly),
    [tournaments],
  );

  const members = players;
  const stats = useMemo(
    () => ({
      users: members.length,
      ongoing: realTournaments.filter((t) => t.status === "ongoing").length,
      finishedMatches: realTournaments.reduce(
        (acc, t) => acc + t.bracket.filter((m) => m.winnerId).length,
        0,
      ),
      activeVotes: votes.filter((v) => v.active).length,
    }),
    [members.length, realTournaments, votes],
  );

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Shield className="mx-auto text-[var(--gold)]" size={40} />
        <h1 className="mt-4 text-2xl font-bold">يلزم دخول المشرفين</h1>
        <Link href="/login?portal=admin" className="btn-gold mt-6 inline-flex">
          تسجيل دخول المشرفين
        </Link>
      </div>
    );
  }

  if (!isStaff(liveRole)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">غير مصرح</h1>
        <p className="mt-3 text-[var(--muted)]">
          لوحة المشرفين للمالك والمشرفين فقط.
          {user.username ? ` (دخولك الحالي: ${user.username})` : ""}
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          سجّل خروج ثم ادخل من «دخول المشرفين» مرة ثانية.
        </p>
        <Link href="/login?portal=admin" className="btn-gold mt-6 inline-flex">
          إعادة دخول المشرفين
        </Link>
      </div>
    );
  }

  const ownerAccount = isOwner(liveRole);

  const resolvedSize = tournamentForm.customSize
    ? Math.max(2, Number(tournamentForm.customSize) || 2)
    : tournamentForm.size;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "registrations",
      label: "رابط تسجيل اليوزرات",
      icon: <ClipboardList size={16} />,
    },
    { id: "tournaments", label: "البطولات", icon: <Trophy size={16} /> },
    { id: "overview", label: "نظرة عامة", icon: <BarChart3 size={16} /> },
    { id: "votes", label: "التصويتات", icon: <Vote size={16} /> },
    { id: "news", label: "الأخبار", icon: <Megaphone size={16} /> },
    { id: "users", label: "المستخدمون", icon: <Users size={16} /> },
    { id: "achievements", label: "الإنجازات", icon: <Shield size={16} /> },
  ];

  const activeTournament =
    realTournaments.find((t) => t.id === scoreForm.tournamentId) ??
    realTournaments[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--gold)]">ADMIN</p>
          <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
            لوحة المشرفين
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            مرحباً {user.username} ({roleLabel(liveRole)}) ·{" "}
            {storageMode === "supabase" ? "سيرفر" : "محلي"}
          </p>
        </div>
        {toast ? <p className="text-sm text-[var(--gold-soft)]">{toast}</p> : null}
      </div>

      {/* قسم منفصل تماماً — رابط تسجيل اليوزرات قبل البطولة */}
      <section className="mb-8 rounded-2xl border-2 border-[var(--gold)]/50 bg-[var(--gold-dim)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)] text-black">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)]">
                REGISTRATION LINK
              </p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                رابط تسجيل اليوزرات
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--muted)]">
                منفصل عن البطولة. أنشئ الرابط أولاً، الأعضاء يسجّلون يوزراتهم،
                وبعدين تسوي البطولة والشجرة.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-gold shrink-0 !px-6 !py-3 text-base"
            onClick={() => setTab("registrations")}
          >
            <ClipboardList size={18} />
            إنشاء رابط تسجيل
          </button>
        </div>
        {registrationLinks.length > 0 ? (
          <p className="mt-4 text-xs text-[var(--gold-soft)]">
            عندك {registrationLinks.length} رابط تسجيل نشط/محفوظ — افتح القسم
            تحت للنسخ أو موافقة الأسماء.
          </p>
        ) : null}
      </section>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTab("tournaments")}
          className="panel panel-hover flex flex-col items-start gap-1 p-4 text-start"
        >
          <Trophy size={18} className="text-[var(--gold)]" />
          <span className="font-bold">إنشاء بطولة</span>
          <span className="text-xs text-[var(--muted)]">
            أنشئ دوري وشجرة — التحكم من إعدادات البطولة
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("users")}
          className="panel panel-hover flex flex-col items-start gap-1 p-4 text-start"
        >
          <Users size={18} className="text-[var(--gold)]" />
          <span className="font-bold">المستخدمون والمشرفون</span>
          <span className="text-xs text-[var(--muted)]">
            {ownerAccount
              ? "امنح صلاحية مشرف لأي حساب"
              : "عرض الأعضاء"}
          </span>
        </button>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition duration-300 ${
              tab === t.id
                ? "bg-[var(--gold)] font-bold text-black"
                : t.id === "registrations"
                  ? "border-2 border-[var(--gold)]/60 text-[var(--gold-soft)] hover:bg-[var(--gold-dim)]"
                  : "border border-white/15 text-zinc-200 hover:border-[var(--gold)]/40"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "الأعضاء", value: stats.users },
              { label: "بطولات جارية", value: stats.ongoing },
              { label: "مباريات منتهية", value: stats.finishedMatches },
              { label: "تصويتات نشطة", value: stats.activeVotes },
            ].map((item) => (
              <div key={item.label} className="panel p-5">
                <p className="text-xs text-[var(--muted)]">{item.label}</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--gold-soft)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn-gold"
            onClick={() => setTab("tournaments")}
          >
            <Trophy size={16} />
            اذهب لإنشاء بطولة
          </button>
          {ownerAccount ? (
            <button
              type="button"
              className="btn-ghost text-sm text-red-300"
              onClick={() => {
                if (confirm("إعادة ضبط الموقع وحذف كل البيانات؟")) {
                  resetStore();
                  notify("تم إعادة ضبط الموقع");
                }
              }}
            >
              إعادة ضبط الموقع
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === "tournaments" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <form
            className="panel space-y-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!tournamentForm.name || !tournamentForm.startDate) return;
              const creatingFormat = tournamentForm.format;
              if (creatingFormat === "duo" && draftTeams.length < 2) {
                notify("لازم تضيف على الأقل تيمين عشان تنشئ بطولة تيم");
                return;
              }
              if (
                creatingFormat === "solo" &&
                selectedParticipants.length > 0 &&
                selectedParticipants.length < 2
              ) {
                notify("اختر لاعبين على الأقل أو اترك القائمة فارغة");
                return;
              }
              createTournament({
                name: tournamentForm.name,
                game: tournamentForm.game as "football",
                startDate: tournamentForm.startDate,
                endDate: tournamentForm.endDate,
                status: tournamentForm.status,
                format: creatingFormat,
                size: resolvedSize,
                prize: tournamentForm.prize,
                description: tournamentForm.description,
                participantIds:
                  creatingFormat === "solo"
                    ? selectedParticipants.slice(0, resolvedSize)
                    : [],
                teams:
                  creatingFormat === "duo"
                    ? draftTeams.slice(0, resolvedSize)
                    : undefined,
                registrationOpen: false,
              });
              setTournamentForm({
                name: "",
                game: "football",
                startDate: "",
                endDate: "",
                status: "upcoming",
                format: "solo",
                size: 16,
                customSize: "",
                prize: "",
                description: "",
              });
              setSelectedParticipants([]);
              setDraftTeams([]);
              setTeamDraft({ p1: "", p2: "" });
              notify(
                creatingFormat === "duo"
                  ? "تم إنشاء بطولة التيم مع الفرق في الشجرة"
                  : "تم إنشاء البطولة مع المشاركين في الشجرة",
              );
            }}
          >
            <h2 className="font-bold">إنشاء بطولة / دوري</h2>
            <p className="text-sm text-[var(--muted)]">
              اختر النوع والحجم والأسماء مرة واحدة — سولو: لاعبين · تيم: كل تيم
              شخصين. ما تحتاج ترجع تختار من جديد بعد الإنشاء.
            </p>
            <input
              placeholder="اسم البطولة"
              value={tournamentForm.name}
              onChange={(e) =>
                setTournamentForm((f) => ({ ...f, name: e.target.value }))
              }
              className="input-field"
              required
            />
            <select
              value={tournamentForm.game}
              onChange={(e) =>
                setTournamentForm((f) => ({ ...f, game: e.target.value }))
              }
              className="input-field"
            >
              <option value="football">كرة القدم</option>
              <option value="billiards">البلياردو</option>
              <option value="tennis">التنس</option>
              <option value="chess">الشطرنج</option>
              <option value="other">أخرى</option>
            </select>

            <div>
              <p className="mb-2 text-xs text-[var(--muted)]">نوع البطولة / القرعة</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["solo", "فردية — لاعب ضد لاعب"],
                    ["duo", "جماعية (تيم) — أنت + شريك"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setTournamentForm((f) => ({ ...f, format: value }));
                      setSelectedParticipants([]);
                      setDraftTeams([]);
                      setTeamDraft({ p1: "", p2: "" });
                    }}
                    className={`px-3 py-1.5 text-sm transition ${
                      tournamentForm.format === value
                        ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
                        : "border border-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {tournamentForm.format === "duo"
                  ? "التسجيل يطلب يوزرين (يمين ويسار) ويُضافان كفريق في الشجرة."
                  : "التسجيل يطلب يوزراً واحداً، أو اختياراً من قائمة أعضاء الموقع."}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs text-[var(--muted)]">
                {tournamentForm.format === "duo"
                  ? "عدد الفرق في الشجرة"
                  : "حجم الدوري (غير مقيد بـ 8)"}
              </p>
              <div className="mb-2 flex flex-wrap gap-2">
                {BRACKET_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      setTournamentForm((f) => ({
                        ...f,
                        size,
                        customSize: "",
                      }))
                    }
                    className={`px-3 py-1.5 text-sm transition ${
                      !tournamentForm.customSize && tournamentForm.size === size
                        ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
                        : "border border-white/10"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={2}
                max={128}
                placeholder="أو اكتب عدداً مخصصاً (مثل 24 أو 48)"
                value={tournamentForm.customSize}
                onChange={(e) =>
                  setTournamentForm((f) => ({
                    ...f,
                    customSize: e.target.value,
                  }))
                }
                className="input-field"
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                سيتم بناء شجرة بحجم {resolvedSize} (يُقرّب لأقرب قوة 2 تلقائياً
                مع باي إن لزم)
              </p>
            </div>

            <input
              type="date"
              value={tournamentForm.startDate}
              onChange={(e) =>
                setTournamentForm((f) => ({ ...f, startDate: e.target.value }))
              }
              className="input-field"
              required
            />
            <input
              type="date"
              value={tournamentForm.endDate}
              onChange={(e) =>
                setTournamentForm((f) => ({ ...f, endDate: e.target.value }))
              }
              className="input-field"
            />
            <input
              placeholder="الجائزة (اختياري)"
              value={tournamentForm.prize}
              onChange={(e) =>
                setTournamentForm((f) => ({ ...f, prize: e.target.value }))
              }
              className="input-field"
            />
            <textarea
              placeholder="وصف البطولة"
              value={tournamentForm.description}
              onChange={(e) =>
                setTournamentForm((f) => ({
                  ...f,
                  description: e.target.value,
                }))
              }
              className="input-field min-h-24"
            />
            <select
              value={tournamentForm.status}
              onChange={(e) =>
                setTournamentForm((f) => ({
                  ...f,
                  status: e.target.value as TournamentStatus,
                }))
              }
              className="input-field"
            >
              <option value="upcoming">قادمة</option>
              <option value="ongoing">جارية</option>
              <option value="finished">منتهية</option>
            </select>

            {tournamentForm.format === "solo" ? (
              <div>
                <p className="mb-2 text-xs text-[var(--muted)]">
                  اختيار اللاعبين ({selectedParticipants.length}/{resolvedSize})
                </p>
                <div className="max-h-48 space-y-1 overflow-auto rounded-xl border border-white/10 p-2 scrollbar-thin">
                  {members.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">
                      لا أعضاء بعد — يمكن إنشاء شجرة فارغة ثم تعبئتها لاحقاً.
                    </p>
                  ) : (
                    members.map((m) => {
                      const checked = selectedParticipants.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedParticipants((prev) =>
                                checked
                                  ? prev.filter((id) => id !== m.id)
                                  : prev.length < resolvedSize
                                    ? [...prev, m.id]
                                    : prev,
                              )
                            }
                          />
                          <span dir="ltr" className="username-ltr">
                            {m.username}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-white/10 p-3">
                <p className="text-xs text-[var(--muted)]">
                  اختيار التيمات — كل تيم = شخصين ({draftTeams.length}/
                  {resolvedSize})
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    className="input-field"
                    value={teamDraft.p1}
                    onChange={(e) =>
                      setTeamDraft((d) => ({ ...d, p1: e.target.value }))
                    }
                  >
                    <option value="">عضو التيم الأول</option>
                    {members
                      .filter(
                        (m) =>
                          m.id !== teamDraft.p2 &&
                          !draftTeams.some(
                            (t) =>
                              t.player1Id === m.id || t.player2Id === m.id,
                          ),
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.username}
                        </option>
                      ))}
                  </select>
                  <select
                    className="input-field"
                    value={teamDraft.p2}
                    onChange={(e) =>
                      setTeamDraft((d) => ({ ...d, p2: e.target.value }))
                    }
                  >
                    <option value="">عضو التيم الثاني</option>
                    {members
                      .filter(
                        (m) =>
                          m.id !== teamDraft.p1 &&
                          !draftTeams.some(
                            (t) =>
                              t.player1Id === m.id || t.player2Id === m.id,
                          ),
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.username}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-ghost w-full !py-2 text-sm"
                  onClick={() => {
                    if (!teamDraft.p1 || !teamDraft.p2) {
                      notify("اختر شخصين للتيم");
                      return;
                    }
                    if (teamDraft.p1 === teamDraft.p2) {
                      notify("التيم لازم شخصين مختلفين");
                      return;
                    }
                    if (draftTeams.length >= resolvedSize) {
                      notify(`وصلت لحد ${resolvedSize} تيم`);
                      return;
                    }
                    setDraftTeams((prev) => [
                      ...prev,
                      { player1Id: teamDraft.p1, player2Id: teamDraft.p2 },
                    ]);
                    setTeamDraft({ p1: "", p2: "" });
                  }}
                >
                  إضافة التيم للقائمة
                </button>
                {draftTeams.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">
                    أضف التيمات هنا قبل الإنشاء — كل تيم يدخل الشجرة معاً.
                  </p>
                ) : (
                  <div className="max-h-40 space-y-1.5 overflow-auto scrollbar-thin">
                    {draftTeams.map((t, i) => {
                      const a = members.find((m) => m.id === t.player1Id);
                      const b = members.find((m) => m.id === t.player2Id);
                      return (
                        <div
                          key={`${t.player1Id}-${t.player2Id}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm"
                        >
                          <span dir="ltr" className="username-ltr font-semibold">
                            {a?.username} + {b?.username}
                          </span>
                          <button
                            type="button"
                            className="text-xs text-red-300"
                            onClick={() =>
                              setDraftTeams((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                          >
                            حذف
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn-gold w-full">
              إنشاء البطولة والشجرة
            </button>
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => setTab("registrations")}
            >
              <ClipboardList size={16} />
              إنشاء خانة تسجيل في الموقع
            </button>
          </form>

          <div className="space-y-4">
            <div className="space-y-3">
              {realTournaments.length === 0 ? (
                <div className="panel p-5 text-sm text-[var(--muted)]">
                  لا بطولات بعد — أنشئ أول دوري من النموذج.
                </div>
              ) : (
                realTournaments.map((t) => (
                  <div key={t.id} className="panel space-y-3 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold">{t.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {formatLabels[t.format === "duo" ? "duo" : "solo"]} ·{" "}
                          {t.format === "duo"
                            ? `${t.size} فرق`
                            : `دوري ${t.size}`}{" "}
                          · {t.status} · {t.participants.length}{" "}
                          {t.format === "duo" ? "فريق" : "مشارك"}
                          {(t.pendingRegistrations?.length ?? 0) > 0
                            ? ` · ${t.pendingRegistrations!.length} تسجيل بانتظار`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/tournaments/${t.id}/settings`}
                          className="btn-gold !px-3 !py-1.5 text-xs"
                        >
                          إعدادات البطولة
                        </Link>
                        <button
                          type="button"
                          className="btn-ghost !px-3 !py-1.5 text-xs"
                          onClick={() => {
                            setTournaments((prev) =>
                              prev.map((x) =>
                                x.id === t.id
                                  ? {
                                      ...x,
                                      status:
                                        x.status === "upcoming"
                                          ? "ongoing"
                                          : x.status === "ongoing"
                                            ? "finished"
                                            : "upcoming",
                                    }
                                  : x,
                              ),
                            );
                            notify("تم تحديث الحالة");
                          }}
                        >
                          تغيير الحالة
                        </button>
                        <button
                          type="button"
                          className="btn-ghost !px-3 !py-1.5 text-xs"
                          onClick={() => {
                            setTournaments((prev) =>
                              prev.map((x) =>
                                x.id === t.id
                                  ? {
                                      ...x,
                                      size: x.participants.length || x.size,
                                      bracket: createBracket(
                                        x.participants.length || x.size,
                                        x.participants,
                                        { shuffle: true },
                                      ),
                                      bracketUpdatedAt: new Date().toISOString(),
                                    }
                                  : x,
                              ),
                            );
                            notify("تم سحب القرعة عشوائياً");
                          }}
                        >
                          سحب القرعة
                        </button>
                        <button
                          type="button"
                          className="btn-ghost !px-3 !py-1.5 text-xs text-red-300"
                          onClick={() => {
                            setTournaments((prev) =>
                              prev.filter((x) => x.id !== t.id),
                            );
                            notify("تم حذف البطولة");
                          }}
                        >
                          حذف
                        </button>
                        <Link
                          href={`/tournaments/${t.id}`}
                          className="btn-ghost !px-3 !py-1.5 text-xs"
                        >
                          فتح
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {realTournaments.length > 0 ? (
              <form
                className="panel space-y-3 p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const tid = scoreForm.tournamentId || realTournaments[0].id;
                  const mid = scoreForm.matchId;
                  if (!mid) return;
                  void recordMatchResult({
                    tournamentId: tid,
                    matchId: mid,
                    score1: Number(scoreForm.score1),
                    score2: Number(scoreForm.score2),
                  }).then((res) => {
                    notify(
                      res.ok
                        ? "تم حفظ النتيجة + منح النقاط والعملات"
                        : res.error || "فشل الحفظ",
                    );
                  });
                }}
              >
                <h2 className="font-bold">تسجيل نتيجة مباراة</h2>
                <select
                  className="input-field"
                  value={scoreForm.tournamentId || realTournaments[0]?.id}
                  onChange={(e) =>
                    setScoreForm((f) => ({
                      ...f,
                      tournamentId: e.target.value,
                      matchId: "",
                    }))
                  }
                >
                  {realTournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  className="input-field"
                  value={scoreForm.matchId}
                  onChange={(e) =>
                    setScoreForm((f) => ({ ...f, matchId: e.target.value }))
                  }
                  required
                >
                  <option value="">اختر المباراة</option>
                  {(activeTournament?.bracket ?? [])
                    .filter((m) => m.player1Id && m.player2Id)
                    .map((m) => {
                      const gp = (id?: string) =>
                        players.find((p) => p.id === id);
                      const e1 = activeTournament
                        ? entryLabel(activeTournament, m.player1Id, gp)
                        : undefined;
                      const e2 = activeTournament
                        ? entryLabel(activeTournament, m.player2Id, gp)
                        : undefined;
                      return (
                        <option key={m.id} value={m.id}>
                          {e1?.label} ضد {e2?.label}
                        </option>
                      );
                    })}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="نتيجة 1"
                    className="input-field"
                    value={scoreForm.score1}
                    onChange={(e) =>
                      setScoreForm((f) => ({ ...f, score1: e.target.value }))
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="نتيجة 2"
                    className="input-field"
                    value={scoreForm.score2}
                    onChange={(e) =>
                      setScoreForm((f) => ({ ...f, score2: e.target.value }))
                    }
                  />
                </div>
                <button type="submit" className="btn-gold w-full">
                  حفظ النتيجة
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "registrations" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <form
            className="panel space-y-3 p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!regLinkForm.title.trim()) return;
              const created = await createRegistrationLink({
                title: regLinkForm.title.trim(),
                format: regLinkForm.format,
                size: regLinkForm.size,
                placement: regLinkForm.placement,
                registrationEndsAt: regLinkForm.registrationEndsAt
                  ? new Date(regLinkForm.registrationEndsAt).toISOString()
                  : undefined,
              });
              if (created.error) {
                notify(created.error);
                return;
              }
              const fullUrl = `${window.location.origin}${created.urlPath}`;
              setLastRegLink(fullUrl);
              await copyToClipboard(fullUrl);
              setRegLinkForm({
                title: "",
                format: "solo",
                size: 32,
                placement: "both",
                registrationEndsAt: "",
              });
              notify("تم إنشاء رابط التسجيل — انسخه وأرسله للقروب");
            }}
          >
            <h2 className="font-bold">إنشاء رابط تسجيل (منفصل عن البطولة)</h2>
            <p className="text-sm text-[var(--muted)]">
              قبل ما تنشئ بطولة: سوّ رابط تسجيل فقط. الأعضاء يسجّلون يوزراتهم،
              وأنت توافق عليهم لاحقاً. مو بطولة ولا شجرة — بس تسجيل.
            </p>
            <input
              className="input-field"
              placeholder="عنوان الرابط (مثال: تسجيل بطولة الجمعة)"
              value={regLinkForm.title}
              onChange={(e) =>
                setRegLinkForm((f) => ({ ...f, title: e.target.value }))
              }
              required
            />
            <div>
              <p className="mb-2 text-xs text-[var(--muted)]">نوع التسجيل</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["solo", "فردي — يوزر واحد"],
                    ["duo", "تيم — أنت + شريك"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setRegLinkForm((f) => ({ ...f, format: value }))
                    }
                    className={`px-3 py-1.5 text-sm transition ${
                      regLinkForm.format === value
                        ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
                        : "border border-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-[var(--muted)]">
                أين يظهر رابط التسجيل في الموقع
              </p>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ["home", "الرئيسية فقط — تحت البانر مباشرة"],
                    ["join", "صفحة التسجيل فقط (/join)"],
                    ["both", "الرئيسية + صفحة التسجيل"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setRegLinkForm((f) => ({ ...f, placement: value }))
                    }
                    className={`rounded-xl px-3 py-2 text-start text-sm transition ${
                      regLinkForm.placement === value
                        ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
                        : "border border-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm">
              <span className="mb-2 block text-[var(--muted)]">
                الحد الأقصى{" "}
                {regLinkForm.format === "duo" ? "للفرق" : "للمشاركين"}
              </span>
              <input
                type="number"
                min={2}
                max={128}
                className="input-field"
                value={regLinkForm.size}
                onChange={(e) =>
                  setRegLinkForm((f) => ({
                    ...f,
                    size: Math.max(2, Number(e.target.value) || 2),
                  }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-[var(--muted)]">
                موعد إغلاق التسجيل (اختياري)
              </span>
              <input
                type="datetime-local"
                className="input-field"
                value={regLinkForm.registrationEndsAt}
                onChange={(e) =>
                  setRegLinkForm((f) => ({
                    ...f,
                    registrationEndsAt: e.target.value,
                  }))
                }
              />
            </label>
            <button type="submit" className="btn-gold w-full">
              إنشاء رابط التسجيل
            </button>
            {lastRegLink ? (
              <p className="break-all text-xs text-[var(--gold-soft)]">
                رابط التسجيل: {lastRegLink}
              </p>
            ) : null}
          </form>

          <div className="space-y-3">
            {registrationLinks.length === 0 ? (
              <div className="panel p-5 text-sm text-[var(--muted)]">
                لا روابط تسجيل بعد — أنشئ رابط منفصل عن البطولة من النموذج.
              </div>
            ) : (
              registrationLinks.map((t) => {
                const format = getTournamentFormat(t);
                const open = isRegistrationOpen(t);
                const pending = t.pendingRegistrations?.length ?? 0;
                const place = getRegistrationPlacement(t);
                return (
                  <div key={t.id} className="panel space-y-3 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold">{t.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          رابط تسجيل · {formatLabels[format]} ·{" "}
                          {placementLabels[place]} · {registrationStatusLabel(t)}{" "}
                          · {pending} بانتظار
                        </p>
                        <p
                          dir="ltr"
                          className="mt-1 text-xs text-[var(--gold-soft)]"
                        >
                          {registrationSharePath(t)}
                        </p>
                        {t.registrationEndsAt ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            يغلق:{" "}
                            {formatRegistrationDeadline(t.registrationEndsAt)}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 text-xs ${
                          open
                            ? "text-[var(--gold-soft)]"
                            : "text-zinc-500"
                        }`}
                      >
                        {open ? "ظاهرة" : "مغلقة"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["home", "رئيسية"],
                          ["join", "/join"],
                          ["both", "الاثنين"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={`!px-2.5 !py-1 text-xs ${
                            place === value
                              ? "btn-gold"
                              : "btn-ghost"
                          }`}
                          onClick={() => {
                            setTournaments((prev) =>
                              prev.map((x) =>
                                x.id === t.id
                                  ? { ...x, registrationPlacement: value }
                                  : x,
                              ),
                            );
                            notify(`مكان الخانة: ${placementLabels[value]}`);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="btn-ghost !px-3 !py-1.5 text-xs"
                        onClick={async () => {
                          const ok = await copyToClipboard(
                            `${window.location.origin}${registrationSharePath(t)}`,
                          );
                          notify(ok ? "تم نسخ الرابط القصير" : "تعذر النسخ");
                        }}
                      >
                        نسخ الرابط
                      </button>
                      <Link
                        href={`/tournaments/${t.id}/settings`}
                        className="btn-gold !px-3 !py-1.5 text-xs"
                      >
                        إعدادات التسجيل
                      </Link>
                      <button
                        type="button"
                        className="btn-ghost !px-3 !py-1.5 text-xs text-red-300"
                        onClick={async () => {
                          if (
                            !confirm(
                              "هل تؤكد حذف رابط التسجيل؟\nسيُحذف الرابط وجميع المسجّلين فيه نهائياً.",
                            )
                          ) {
                            return;
                          }
                          const res = await deleteRegistrationLink(t.id);
                          notify(
                            res.ok
                              ? "تم حذف رابط التسجيل"
                              : res.error || "فشل الحذف",
                          );
                        }}
                      >
                        حذف الرابط
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {tab === "votes" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            className="panel space-y-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const options = voteOptions
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean);
              if (!voteQuestion || options.length < 2) return;
              setVotes((prev) => [
                {
                  id: `v${Date.now()}`,
                  question: voteQuestion,
                  options: options.map((label, i) => ({
                    id: `opt-${Date.now()}-${i}`,
                    label,
                    votes: 0,
                  })),
                  active: true,
                  createdAt: new Date().toISOString().slice(0, 10),
                  endsAt: new Date(Date.now() + 7 * 86400000)
                    .toISOString()
                    .slice(0, 10),
                  totalVotes: 0,
                  votedBy: [],
                },
                ...prev,
              ]);
              setVoteQuestion("");
              addNotification({
                title: "تصويت جديد",
                message: voteQuestion,
                type: "vote",
              });
              notify("تم إنشاء التصويت");
            }}
          >
            <h2 className="font-bold">إنشاء تصويت</h2>
            <input
              value={voteQuestion}
              onChange={(e) => setVoteQuestion(e.target.value)}
              placeholder="نص السؤال"
              className="input-field"
              required
            />
            <textarea
              value={voteOptions}
              onChange={(e) => setVoteOptions(e.target.value)}
              rows={4}
              className="input-field"
              placeholder="كل خيار في سطر"
            />
            <button type="submit" className="btn-gold w-full">
              نشر التصويت
            </button>
          </form>
          <div className="space-y-3">
            {votes.length === 0 ? (
              <div className="panel p-5 text-sm text-[var(--muted)]">
                لا تصويتات بعد
              </div>
            ) : (
              votes.map((v) => (
                <div key={v.id} className="panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{v.question}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {v.totalVotes} صوت
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-red-300"
                      onClick={() => {
                        setVotes((prev) => prev.filter((x) => x.id !== v.id));
                        notify("تم الحذف");
                      }}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {tab === "news" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            className="panel space-y-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              setNews((prev) => [
                {
                  id: `n${Date.now()}`,
                  title: newsForm.title,
                  content: newsForm.content,
                  category: newsForm.category as "announcement",
                  author: user.username,
                  publishedAt: new Date().toISOString(),
                  pinned: false,
                },
                ...prev,
              ]);
              setNewsForm({ title: "", content: "", category: "announcement" });
              addNotification({
                title: "خبر جديد",
                message: newsForm.title,
                type: "news",
              });
              notify("تم نشر الخبر");
            }}
          >
            <h2 className="font-bold">نشر خبر / إعلان</h2>
            <input
              value={newsForm.title}
              onChange={(e) =>
                setNewsForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="العنوان"
              className="input-field"
              required
            />
            <textarea
              value={newsForm.content}
              onChange={(e) =>
                setNewsForm((f) => ({ ...f, content: e.target.value }))
              }
              rows={5}
              placeholder="المحتوى"
              className="input-field"
              required
            />
            <select
              value={newsForm.category}
              onChange={(e) =>
                setNewsForm((f) => ({ ...f, category: e.target.value }))
              }
              className="input-field"
            >
              <option value="announcement">إعلان</option>
              <option value="schedule">مواعيد</option>
              <option value="results">نتائج</option>
              <option value="rules">قوانين</option>
              <option value="prize">جوائز</option>
            </select>
            <button type="submit" className="btn-gold w-full">
              نشر
            </button>
          </form>
          <div className="space-y-3">
            {news.length === 0 ? (
              <div className="panel p-5 text-sm text-[var(--muted)]">
                لا أخبار بعد
              </div>
            ) : (
              news.map((n) => (
                <div key={n.id} className="panel p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-bold">{n.title}</p>
                    <button
                      type="button"
                      className="text-xs text-red-300"
                      onClick={() => {
                        setNews((prev) => prev.filter((x) => x.id !== n.id));
                        notify("تم الحذف");
                      }}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="space-y-4">
          <div className="panel p-4 text-sm text-[var(--muted)]">
            {ownerAccount
              ? "أنت المالك — تقدر تمنح أو تزيل صلاحية المشرف. المشرف يصير عنده كل صلاحيات الإدارة: تأهيل، نتائج، تعبئة الشجرة، روابط التسجيل، وإنشاء البطولات."
              : "منح صلاحية المشرف متاح للمالك فقط. كمشرف عندك نفس مزايا الإدارة: تأهيل، نتائج، تعديل الشجرة، وروابط التسجيل."}
          </div>

          <div className="panel space-y-3 p-5">
            <h2 className="font-bold">استيراد يوزرات قروب Plato</h2>
            <p className="text-sm text-[var(--muted)]">
              قائمة القروب محفوظة من الصور. اضغط الاستيراد لإنشاء كل الحسابات
              جاهزة. وقت التسجيل العضو يبحث عن يوزره (أول حرف يصفّي القائمة)
              ويختار حسابه.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
              <span>
                في الموقع الآن: {players.length} حساب · بانتظار التفعيل:{" "}
                {players.filter((p) => p.unclaimed).length}
              </span>
              <button
                type="button"
                disabled={importing || storageMode !== "supabase"}
                className="btn-gold !px-4 !py-2 text-sm disabled:opacity-60"
                onClick={async () => {
                  if (importing) return;
                  if (storageMode !== "supabase") {
                    notify("الاستيراد يحتاج السيرفر (Supabase)");
                    return;
                  }
                  setImporting(true);
                  try {
                    const res = await fetch("/api/auth/import", {
                      method: "POST",
                      credentials: "same-origin",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ useBuiltin: true }),
                    }).then((r) => r.json());
                    if (!res.ok) {
                      notify(res.error || "فشل الاستيراد");
                      return;
                    }
                    const storeRes = await fetch("/api/store", {
                      cache: "no-store",
                      credentials: "same-origin",
                    }).then((r) => r.json());
                    if (storeRes.ok && Array.isArray(storeRes.data?.players)) {
                      setPlayers(storeRes.data.players);
                    }
                    notify(
                      `تم استيراد ${res.created} يوزر من قائمة القروب` +
                        (res.skipped
                          ? ` · تخطي ${res.skipped} موجود مسبقاً`
                          : ""),
                    );
                  } catch {
                    notify("تعذر الاتصال بالسيرفر");
                  } finally {
                    setImporting(false);
                  }
                }}
              >
                {importing
                  ? "جاري الاستيراد..."
                  : "استيراد كل يوزرات القروب المحفوظة"}
              </button>
              <button
                type="button"
                disabled={importing || storageMode !== "supabase"}
                className="btn-ghost !px-4 !py-2 text-sm disabled:opacity-60"
                onClick={async () => {
                  if (importing) return;
                  if (storageMode !== "supabase") {
                    notify("يحتاج السيرفر (Supabase)");
                    return;
                  }
                  setImporting(true);
                  try {
                    const res = await fetch("/api/auth/import", {
                      method: "POST",
                      credentials: "same-origin",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ applyAvatars: true }),
                    }).then((r) => r.json());
                    if (!res.ok) {
                      notify(res.error || "فشل تطبيق الأفتارات");
                      return;
                    }
                    const storeRes = await fetch("/api/store", {
                      cache: "no-store",
                      credentials: "same-origin",
                    }).then((r) => r.json());
                    if (storeRes.ok && Array.isArray(storeRes.data?.players)) {
                      setPlayers(storeRes.data.players);
                    }
                    notify(
                      `تم ربط الأفتار بـ ${res.applied} حساب` +
                        (res.skipped ? ` · تخطي ${res.skipped}` : ""),
                    );
                  } catch {
                    notify("تعذر الاتصال بالسيرفر");
                  } finally {
                    setImporting(false);
                  }
                }}
              >
                {importing
                  ? "جاري التحديث..."
                  : "تطبيق أفتارات القروب على الحسابات (يصحّح الخلط)"}
              </button>
            </div>

            <details className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-sm text-[var(--gold-soft)]">
                أو الصق يوزرات إضافية يدوياً
              </summary>
              <form
                className="mt-3 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!importText.trim() || importing) return;
                  setImporting(true);
                  try {
                    const res = await fetch("/api/auth/import", {
                      method: "POST",
                      credentials: "same-origin",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ text: importText }),
                    }).then((r) => r.json());
                    if (!res.ok) {
                      notify(res.error || "فشل الاستيراد");
                      return;
                    }
                    const storeRes = await fetch("/api/store", {
                      cache: "no-store",
                      credentials: "same-origin",
                    }).then((r) => r.json());
                    if (storeRes.ok && Array.isArray(storeRes.data?.players)) {
                      setPlayers(storeRes.data.players);
                    }
                    setImportText("");
                    notify(
                      `تم استيراد ${res.created} يوزر` +
                        (res.skipped
                          ? ` · تخطي ${res.skipped} موجود مسبقاً`
                          : ""),
                    );
                  } catch {
                    notify("تعذر الاتصال بالسيرفر");
                  } finally {
                    setImporting(false);
                  }
                }}
              >
                <textarea
                  className="input-field min-h-32 font-mono text-sm"
                  dir="ltr"
                  placeholder={"7_c\nplayer2\nplayer3"}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={importing || !importText.trim()}
                  className="btn-ghost !px-4 !py-2 text-sm disabled:opacity-60"
                >
                  استيراد القائمة الملصوقة
                </button>
              </form>
            </details>
          </div>

          <div className="panel overflow-hidden">
            {players.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted)]">لا مستخدمين</p>
            ) : (
              <div className="divide-y divide-white/5">
                {players.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p dir="ltr" className="username-ltr font-semibold">
                        {u.username}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {roleLabel(u.role)}
                        {u.unclaimed ? " · بانتظار تعيين كلمة المرور" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {ownerAccount && u.role !== "owner" ? (
                        <button
                          type="button"
                          className="btn-ghost !px-3 !py-1.5 text-xs"
                          onClick={() => {
                            const nextRole =
                              u.role === "admin" ? "member" : "admin";
                            void (async () => {
                              try {
                                const res = await fetch("/api/profiles/role", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  credentials: "same-origin",
                                  body: JSON.stringify({
                                    profileId: u.id,
                                    role: nextRole,
                                  }),
                                });
                                const json = await res.json();
                                if (!json?.ok) {
                                  notify(json?.error || "فشل تحديث الصلاحية");
                                  return;
                                }
                                setPlayers((prev) =>
                                  prev.map((x) => {
                                    if (x.id !== u.id) return x;
                                    const badges = x.badges.filter(
                                      (b) => b !== "مشرف" && b !== "المالك",
                                    );
                                    if (nextRole === "admin") {
                                      badges.push("مشرف");
                                    }
                                    return {
                                      ...x,
                                      role: nextRole,
                                      rank:
                                        nextRole === "admin"
                                          ? "مشرف"
                                          : "مبتدئ",
                                      badges,
                                      ...(json.player || {}),
                                      id: x.id,
                                      username: x.username,
                                    };
                                  }),
                                );
                                notify(
                                  nextRole === "admin"
                                    ? "تم منح مشرف — يقدر يأهّل ويدير الشجرة فوراً"
                                    : "تمت إزالة الإشراف",
                                );
                              } catch {
                                notify("تعذر الاتصال بالسيرفر");
                              }
                            })();
                          }}
                        >
                          {u.role === "admin" ? "إزالة مشرف" : "منح مشرف"}
                        </button>
                      ) : null}
                      <Link
                        href={`/players/${u.id}`}
                        className="btn-ghost !px-3 !py-1.5 text-xs"
                      >
                        الملف
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "achievements" ? (
        <form
          className="panel max-w-xl space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!achievementForm.playerId || !achievementForm.title) return;
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === achievementForm.playerId
                  ? {
                      ...p,
                      achievements: [
                        {
                          id: `ach-${Date.now()}`,
                          title: achievementForm.title,
                          description: "إنجاز مُضاف من لوحة المشرفين",
                          icon: achievementForm.icon,
                          rarity: "rare",
                          earnedAt: new Date().toISOString().slice(0, 10),
                        },
                        ...p.achievements,
                      ],
                    }
                  : p,
              ),
            );
            notify("تم إضافة الإنجاز");
            setAchievementForm((f) => ({ ...f, title: "" }));
          }}
        >
          <h2 className="font-bold">إضافة إنجاز للاعب</h2>
          <select
            value={achievementForm.playerId}
            onChange={(e) =>
              setAchievementForm((f) => ({ ...f, playerId: e.target.value }))
            }
            className="input-field"
            required
          >
            <option value="">اختر لاعباً</option>
            {members.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
          <input
            value={achievementForm.title}
            onChange={(e) =>
              setAchievementForm((f) => ({ ...f, title: e.target.value }))
            }
            placeholder="عنوان الإنجاز"
            className="input-field"
            required
          />
          <input
            value={achievementForm.icon}
            onChange={(e) =>
              setAchievementForm((f) => ({ ...f, icon: e.target.value }))
            }
            className="input-field"
          />
          <button type="submit" className="btn-gold w-full">
            إضافة الإنجاز
          </button>
        </form>
      ) : null}
    </div>
  );
}
