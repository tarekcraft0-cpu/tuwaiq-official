"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createBracket, nextPowerOfTwo } from "@/lib/bracket";
import {
  pickPreferredBracket,
  placeEntryInBracket,
  withBracketTimestamp,
} from "@/lib/bracket-stable";
import {
  STORE_VERSION,
  createEmptyPlayer,
  mergePlayersPreferProgress,
  normalizePlayer,
} from "@/lib/data";
import {
  POINT_REWARDS,
  calcWinRate,
  pointsForMatchResult,
  rankFromPoints,
} from "@/lib/points";
import {
  isRegistrationOpen,
  isShortShareRef,
  makeUniqueShareCode,
  registrationSharePath,
  tournamentSharePath,
} from "@/lib/registration";
import { isStaff } from "@/lib/roles";
import { SHOP_ITEMS, getShopItem } from "@/lib/shop";
import {
  findAdvanceSourceMatch,
  validateFirstToFive,
  winnerFromScores,
  withMatchResult,
  withMatchRevert,
} from "@/lib/match-result";
import {
  getTournamentFormat,
  playerIdsForEntry,
} from "@/lib/tournament-format";
import type {
  HallOfFameEntry,
  NewsItem,
  NotificationItem,
  Player,
  RegistrationPlacement,
  Tournament,
  TournamentFormat,
  TournamentTeam,
  Vote,
} from "@/lib/types";

interface StoreState {
  players: Player[];
  tournaments: Tournament[];
  votes: Vote[];
  news: NewsItem[];
  notifications: NotificationItem[];
  hallOfFame: HallOfFameEntry[];
}

interface AuthUser {
  id: string;
  username: string;
  avatar: string;
  role: Player["role"];
}

interface StoreContextValue extends StoreState {
  ready: boolean;
  storageMode: "local" | "supabase";
  user: AuthUser | null;
  login: (
    username: string,
    password: string,
    portal: "member" | "admin",
  ) => Promise<{ ok: boolean; error?: string }>;
  register: (data: {
    username: string;
    password: string;
    avatar: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  /** تفعيل حساب مستورد من قائمة القروب (يوزر + كلمة مرور جديدة) */
  claimAccount: (
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    username?: string;
    avatar?: string;
    bio?: string;
  }) => void;
  getPlayer: (id?: string) => Player | undefined;
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  setVotes: React.Dispatch<React.SetStateAction<Vote[]>>;
  setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  setHallOfFame: React.Dispatch<React.SetStateAction<HallOfFameEntry[]>>;
  createTournament: (input: {
    name: string;
    game: Tournament["game"];
    startDate: string;
    endDate: string;
    status: Tournament["status"];
    size: number;
    format?: TournamentFormat;
    description?: string;
    prize?: string;
    participantIds?: string[];
    /** فرق جاهزة عند إنشاء بطولة تيم */
    teams?: Array<{
      player1Id: string;
      player2Id: string;
      player3Id?: string;
      name?: string;
    }>;
    registrationOpen?: boolean;
    registrationEndsAt?: string;
  }) => void;
  /** رابط تسجيل فقط (Solo/Duo) — منفصل عن البطولة */
  createRegistrationLink: (input: {
    title: string;
    format: TournamentFormat;
    size?: number;
    registrationEndsAt?: string;
    placement?: RegistrationPlacement;
  }) => Promise<{ id: string; urlPath: string; error?: string }>;
  /** حذف رابط تسجيل / بطولة من السيرفر والمحلي */
  deleteRegistrationLink: (
    tournamentId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  /** إنشاء بطولة وقرعة كاملة من المسجّلين في رابط التسجيل */
  createTournamentFromRegistration: (
    registrationId: string,
    options?: { name?: string },
  ) => {
    ok: boolean;
    error?: string;
    tournamentId?: string;
    path?: string;
  };
  /** توسيع/تغيير العدد المطلوب لرابط التسجيل (مشرف) */
  updateRegistrationCapacity: (
    registrationId: string,
    size: number,
  ) => Promise<{ ok: boolean; error?: string }>;
  /** إرسال يوزر (أو تيم Duo) لقائمة تسجيلات المشرفين */
  submitRegistration: (
    tournamentId: string,
    input: {
      username: string;
      teammateUsername?: string;
      teammate2Username?: string;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  /** إضافة مسجّل من القائمة إلى المشاركين */
  approveRegistration: (
    tournamentId: string,
    requestId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  rejectRegistration: (
    tournamentId: string,
    requestId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  /** تعديل تيم/لاعب مسجّل قبل إنشاء القرعة */
  updatePendingRegistration: (
    tournamentId: string,
    requestId: string,
    input: {
      username: string;
      teammateUsername?: string;
      teammate2Username?: string;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  recordMatchResult: (input: {
    tournamentId: string;
    matchId: string;
    score1: number;
    score2: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  /** تأهيل يدوي من الشجرة — يحدد الفائز مباشرة */
  advanceMatchWinner: (input: {
    tournamentId: string;
    matchId: string;
    winnerId: string;
    score1?: number;
    score2?: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  /** إرجاع تأهيل بالغلط — خطوة واحدة للخلف */
  revertMatchWinner: (input: {
    tournamentId: string;
    matchId: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  /** إعادة سحب القرعة عشوائياً وحفظها فوراً */
  redrawBracket: (
    tournamentId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  /** إنهاء البطولة وحفظ الحالة فوراً */
  finishTournament: (
    tournamentId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  /** تعبئة/استبدال خانة في الشجرة (لاعب أو تيم) */
  assignBracketSlot: (input: {
    tournamentId: string;
    matchId: string;
    side: 1 | 2;
    username?: string;
    teammateUsername?: string;
    /** بعد التعبئة: أهّله للجولة التالية مباشرة */
    advanceAfter?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  buyShopItem: (itemId: string) => { ok: boolean; error?: string };
  equipItem: (
    itemId: string | null,
    slot: "frame" | "title" | "effect",
  ) => void;
  addNotification: (
    item: Omit<NotificationItem, "id" | "createdAt" | "read">,
  ) => void;
  resetStore: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const AUTH_KEY = `${STORE_VERSION}-auth`;
const DATA_KEY = `${STORE_VERSION}-data`;

function blankState(): StoreState {
  return {
    players: [],
    tournaments: [],
    votes: [],
    news: [],
    notifications: [
      {
        id: "welcome",
        title: "مرحباً في طويق",
        message: "الموقع جاهز — سجّل حسابك وانتظر إعلان البطولات.",
        type: "news",
        createdAt: new Date().toISOString(),
        read: false,
      },
    ],
    hallOfFame: [],
  };
}

function rewardPlayer(
  player: Player,
  rankDelta: number,
  coinsDelta: number,
  monthlyDelta = 0,
): Player {
  const rankingPoints = Math.max(0, player.stats.rankingPoints + rankDelta);
  return {
    ...player,
    coins: Math.max(0, player.coins + coinsDelta),
    monthlyScore: (player.monthlyScore ?? 0) + monthlyDelta,
    rank: rankFromPoints(rankingPoints),
    stats: {
      ...player.stats,
      rankingPoints,
    },
  };
}

function applyServerData(
  data: Partial<StoreState>,
  setters: {
    setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
    setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
    setVotes: React.Dispatch<React.SetStateAction<Vote[]>>;
    setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>;
    setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
    setHallOfFame: React.Dispatch<React.SetStateAction<HallOfFameEntry[]>>;
  },
) {
  setters.setPlayers((data.players ?? []).map((p) => normalizePlayer(p)));
  setters.setTournaments(
    (data.tournaments ?? []).map((t) => ({
      ...t,
      pendingRegistrations: t.pendingRegistrations ?? [],
    })),
  );
  setters.setVotes(data.votes ?? []);
  setters.setNews(data.news ?? []);
  setters.setNotifications(data.notifications ?? []);
  setters.setHallOfFame(data.hallOfFame ?? []);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageMode, setStorageMode] = useState<"local" | "supabase">(() =>
    process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "local",
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const syncEnabledRef = useRef(false);
  const lastSyncHashRef = useRef("");
  /** روابط/بطولات حُذفت محلياً — حتى لا يرجّعها الجلب الدوري من السيرفر */
  const deletedIdsRef = useRef<Set<string>>(new Set());
  /** روابط أُنشئت للتو وما زالت تتزامن */
  const recentCreatedIdsRef = useRef<Map<string, number>>(new Map());
  /** يمنع السحب الدوري من مسح تعديلات الشجرة قبل ما توصل السيرفر */
  const recentLocalEditsRef = useRef<Map<string, number>>(new Map());
  /** لقطة لاعبين بعد منح نقاط — للحفظ الفوري */
  const playersRef = useRef<Player[]>([]);
  playersRef.current = players;
  /** ارفع اللاعبين للسيرفر فقط بعد تعديل محلي حقيقي (نقاط/متجر/…) */
  const playersDirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const hasRemote = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

      if (hasRemote) {
        try {
          const [storeRes, meRes] = await Promise.all([
            fetch("/api/store", {
              cache: "no-store",
              credentials: "same-origin",
            }).then((r) => r.json()),
            fetch("/api/auth/me", {
              cache: "no-store",
              credentials: "same-origin",
            }).then((r) => r.json()),
          ]);
          if (cancelled) return;

          if (storeRes.ok && storeRes.data) {
            setStorageMode("supabase");
            applyServerData(storeRes.data, {
              setPlayers,
              setTournaments,
              setVotes,
              setNews,
              setNotifications,
              setHallOfFame,
            });
            lastSyncHashRef.current = JSON.stringify({
              players: storeRes.data.players,
              tournaments: storeRes.data.tournaments,
              votes: storeRes.data.votes,
              news: storeRes.data.news,
              notifications: storeRes.data.notifications,
              hallOfFame: storeRes.data.hallOfFame,
            });
            if (meRes.user) {
              const full = (storeRes.data.players as Player[] | undefined)?.find(
                (p) => p.id === meRes.user.id,
              );
              setUser({
                ...meRes.user,
                role: full?.role || meRes.user.role,
                avatar: full?.avatar || meRes.user.avatar,
              });
            }
            setReady(true);
            // فعّل المزامنة بعد لحظة حتى لا يعيد رفع نفس البيانات فور التحميل
            window.setTimeout(() => {
              syncEnabledRef.current = true;
            }, 1500);
            return;
          }
        } catch {
          /* fall back to local */
        }
      }

      if (cancelled) return;
      setStorageMode("local");
      syncEnabledRef.current = false;
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (
            key &&
            key.startsWith("طويق-") &&
            key !== AUTH_KEY &&
            key !== DATA_KEY
          ) {
            localStorage.removeItem(key);
          }
        }
        const savedAuth = localStorage.getItem(AUTH_KEY);
        const savedData = localStorage.getItem(DATA_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData) as StoreState;
          setPlayers(
            (parsed.players ?? []).map((p) => normalizePlayer(p)),
          );
          setTournaments(parsed.tournaments ?? []);
          setVotes(parsed.votes ?? []);
          setNews(parsed.news ?? []);
          setNotifications(parsed.notifications ?? []);
          setHallOfFame(parsed.hallOfFame ?? []);
        } else {
          const fresh = blankState();
          setPlayers(fresh.players);
          setNotifications(fresh.notifications);
        }
        if (savedAuth) setUser(JSON.parse(savedAuth));
      } catch {
        const fresh = blankState();
        setPlayers(fresh.players);
        setNotifications(fresh.notifications);
      }
      setReady(true);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // حدّث رتبة الجلسة من بيانات السيرفر (مشرف/مالك) لو الكوكي قديم
  useEffect(() => {
    if (!user) return;
    const me = players.find((p) => p.id === user.id);
    if (!me) return;
    if (me.role !== user.role || (me.avatar && me.avatar !== user.avatar)) {
      setUser((u) =>
        u
          ? {
              ...u,
              role: me.role,
              username: me.username,
              avatar: me.avatar || u.avatar,
            }
          : u,
      );
    }
  }, [players, user]);

  // روابط التسجيل والقرعة القديمة تحصل على رمز مشاركة قصير تلقائياً
  useEffect(() => {
    if (!ready) return;
    setTournaments((prev) => {
      let changed = false;
      const upgraded: Tournament[] = [];
      const used = new Set(
        prev
          .flatMap((t) => [t.id, t.shareCode])
          .filter(Boolean)
          .map((c) => String(c).toLowerCase()),
      );
      const next = prev.map((t) => {
        if (t.deleted) return t;
        if (t.shareCode && isShortShareRef(t.shareCode)) return t;
        if (isShortShareRef(t.id)) {
          changed = true;
          const row = { ...t, shareCode: t.id };
          upgraded.push(row);
          return row;
        }
        const code = makeUniqueShareCode(used, 4);
        used.add(code);
        changed = true;
        const row = { ...t, shareCode: code };
        upgraded.push(row);
        return row;
      });
      if (changed && storageMode === "supabase" && upgraded.length) {
        for (const tournament of upgraded) {
          void fetch("/api/tournaments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ tournament }),
          });
        }
      }
      return changed ? next : prev;
    });
  }, [ready, storageMode]);

  // نسخة محلية خفيفة للهوية (بدون صور data:) — تساعد بعد التحديث
  useEffect(() => {
    if (!ready) return;
    if (user) {
      const light = {
        ...user,
        avatar:
          user.avatar?.startsWith("data:") || (user.avatar?.length ?? 0) > 180
            ? "/logo.png"
            : user.avatar,
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(light));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [user, ready]);

  useEffect(() => {
    if (!ready || storageMode !== "local") return;
    localStorage.setItem(
      DATA_KEY,
      JSON.stringify({
        players,
        tournaments,
        votes,
        news,
        notifications,
        hallOfFame,
      } satisfies StoreState),
    );
  }, [
    players,
    tournaments,
    votes,
    news,
    notifications,
    hallOfFame,
    ready,
    storageMode,
  ]);

  // مزامنة تلقائية مع السيرفر بعد أي تعديل (مع تخطي التكرارات)
  useEffect(() => {
    if (!ready || storageMode !== "supabase" || !user) return;
    if (!syncEnabledRef.current) return;

    // مهم: لا ترفع اللاعبين مع كل تغيير بطولة — أجهزة ثانية كانت تمسح نقاط المتأهلين
    const includePlayers = playersDirtyRef.current;
    const payload: Record<string, unknown> = {
      tournaments: tournaments.filter((t) => !deletedIdsRef.current.has(t.id)),
      votes,
      news,
      notifications,
      hallOfFame,
    };
    if (includePlayers) payload.players = players;

    const hash = JSON.stringify(payload);
    if (hash === lastSyncHashRef.current) return;

    const timer = setTimeout(() => {
      if (!syncEnabledRef.current) return;
      const body = JSON.stringify(payload);
      if (body === lastSyncHashRef.current) return;
      void fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      }).then((res) => {
        if (res.ok) {
          lastSyncHashRef.current = body;
          if (includePlayers) playersDirtyRef.current = false;
        }
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    players,
    tournaments,
    votes,
    news,
    notifications,
    hallOfFame,
    ready,
    storageMode,
    user,
  ]);

  // جلب دوري — حتى يظهر للجميع يوزرات المسجّلين من أجهزة أخرى
  useEffect(() => {
    if (!ready || storageMode !== "supabase") return;

    let cancelled = false;

    const pull = async () => {
      try {
        const res = await fetch("/api/store", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const json = await res.json();
        if (cancelled || !json?.ok || !json.data?.tournaments) return;

        const serverTournaments = (
          json.data.tournaments as Tournament[]
        ).filter((t) => !deletedIdsRef.current.has(t.id));
        const now = Date.now();
        for (const [id, ts] of recentCreatedIdsRef.current) {
          if (now - ts > 60_000) recentCreatedIdsRef.current.delete(id);
        }

        setTournaments((prev) => {
          const serverMap = new Map(serverTournaments.map((t) => [t.id, t]));
          const prevIds = new Set(prev.map((t) => t.id));
          const next: Tournament[] = [];
          const nowMs = Date.now();
          const LOCAL_EDIT_MS = 120_000;
          for (const [id, ts] of recentLocalEditsRef.current) {
            if (nowMs - ts > LOCAL_EDIT_MS) {
              recentLocalEditsRef.current.delete(id);
            }
          }

          for (const t of prev) {
            if (deletedIdsRef.current.has(t.id)) continue;
            const s = serverMap.get(t.id);
            if (s) {
              const editedAt = recentLocalEditsRef.current.get(t.id);
              // تعديل محلي حديث (إرجاع / استبدال / تأهيل) — لا تلمس الشجرة من السحب
              const preferTeams = (a?: Tournament["teams"], b?: Tournament["teams"]) =>
                Array.isArray(a) && a.length > 0
                  ? a
                  : Array.isArray(b) && b.length > 0
                    ? b
                    : a ?? b;

              if (editedAt && nowMs - editedAt < LOCAL_EDIT_MS) {
                next.push({
                  ...s,
                  ...t,
                  id: t.id,
                  format: t.format || s.format,
                  teams: preferTeams(t.teams, s.teams),
                  pendingRegistrations:
                    s.pendingRegistrations ?? t.pendingRegistrations ?? [],
                  shareCode: t.shareCode || s.shareCode,
                  bracket: t.bracket,
                  bracketUpdatedAt: t.bracketUpdatedAt || s.bracketUpdatedAt,
                });
                continue;
              }
              const bracket = pickPreferredBracket(
                s.bracket,
                t.bracket,
                s.bracketUpdatedAt,
                t.bracketUpdatedAt,
              );
              next.push({
                ...t,
                ...s,
                id: t.id,
                format: s.format || t.format,
                teams: preferTeams(s.teams, t.teams),
                pendingRegistrations: s.pendingRegistrations ?? [],
                shareCode: t.shareCode || s.shareCode,
                bracket,
                bracketUpdatedAt:
                  bracket === s.bracket
                    ? s.bracketUpdatedAt || t.bracketUpdatedAt
                    : t.bracketUpdatedAt || s.bracketUpdatedAt,
              });
              continue;
            }
            // مو على السيرفر: أبقيه فقط لو أُنشئ للتو ولم يُحذف
            if (recentCreatedIdsRef.current.has(t.id)) {
              next.push(t);
            }
          }

          for (const s of serverTournaments) {
            if (deletedIdsRef.current.has(s.id)) continue;
            if (!prevIds.has(s.id)) next.push(s);
          }
          return next;
        });

        if (Array.isArray(json.data.players) && json.data.players.length) {
          setPlayers((prev) => {
            const map = new Map(
              (json.data.players as Player[]).map((p) => [
                p.id,
                normalizePlayer(p),
              ]),
            );
            if (map.size === 0) return prev;
            const merged = prev.map((p) => {
              const s = map.get(p.id);
              if (!s) return p;
              // نقاط محلية أحدث (تأهيل للتو) ما تنمسح بسحب السيرفر
              return mergePlayersPreferProgress(p, s);
            });
            const extras = (json.data.players as Player[])
              .filter((p) => !prev.some((x) => x.id === p.id))
              .map((p) => normalizePlayer(p));
            return merged.concat(extras);
          });
        }
      } catch {
        /* ignore transient network errors */
      }
    };

    void pull();
    const timer = window.setInterval(pull, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, storageMode]);

  const getPlayer = useCallback(
    (id?: string) => (id ? players.find((p) => p.id === id) : undefined),
    [players],
  );

  const addNotification = useCallback(
    (item: Omit<NotificationItem, "id" | "createdAt" | "read">) => {
      setNotifications((prev) => [
        {
          ...item,
          id: `nt-${Date.now()}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ]);
    },
    [],
  );

  const createTournament = useCallback(
    (input: {
      name: string;
      game: Tournament["game"];
      startDate: string;
      endDate: string;
      status: Tournament["status"];
      size: number;
      format?: TournamentFormat;
      description?: string;
      prize?: string;
      participantIds?: string[];
      teams?: Array<{
        player1Id: string;
        player2Id: string;
        player3Id?: string;
        name?: string;
      }>;
      registrationOpen?: boolean;
      registrationEndsAt?: string;
    }) => {
      const format: TournamentFormat = input.format === "duo" ? "duo" : "solo";
      let participants: string[] = [];
      let teams: TournamentTeam[] | undefined;

      if (format === "duo") {
        teams = (input.teams ?? []).map((t, i) => {
          const p1 = players.find((p) => p.id === t.player1Id);
          const p2 = players.find((p) => p.id === t.player2Id);
          const p3 = t.player3Id
            ? players.find((p) => p.id === t.player3Id)
            : undefined;
          return {
            id: `team-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            player1Id: t.player1Id,
            player2Id: t.player2Id,
            player3Id: t.player3Id,
            name:
              t.name ||
              [p1?.username, p2?.username, p3?.username]
                .filter(Boolean)
                .join(" + ") ||
              `فريق ${i + 1}`,
          };
        });
        participants = teams.map((t) => t.id);
      } else {
        participants = input.participantIds ?? [];
      }

      // لو فيه مشاركين: الشجرة على عددهم. لو فاضي: الحجم المطلوب فقط.
      const registeredCount = participants.length;
      const bracketSize =
        registeredCount > 0
          ? nextPowerOfTwo(registeredCount)
          : nextPowerOfTwo(Math.max(2, input.size));
      const displaySize =
        registeredCount > 0 ? registeredCount : Math.max(2, input.size);
      const taken = tournaments.flatMap((t) =>
        [t.id, t.shareCode].filter(Boolean) as string[],
      );
      const code = makeUniqueShareCode(taken, 4);

      const tournament: Tournament = {
        id: `t-${Date.now()}`,
        shareCode: code,
        name: input.name,
        image: "/logo.png",
        game: input.game,
        startDate: input.startDate,
        endDate: input.endDate || input.startDate,
        participants,
        teams: format === "duo" ? teams : undefined,
        format,
        size: displaySize,
        status: input.status,
        description: input.description || "بطولة رسمية من قروب طويق.",
        prize: input.prize,
        registrationOpen: input.registrationOpen ?? false,
        registrationEndsAt: input.registrationEndsAt || undefined,
        pendingRegistrations: [],
        bracket: createBracket(bracketSize, participants, {
          shuffle: participants.length > 1,
        }),
        bracketUpdatedAt: new Date().toISOString(),
      };
      recentCreatedIdsRef.current.set(tournament.id, Date.now());
      recentLocalEditsRef.current.set(tournament.id, Date.now());
      setTournaments((prev) => [tournament, ...prev]);
      if (storageMode === "supabase") {
        void fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ tournament }),
        });
      }
      addNotification({
        title: "بطولة جديدة",
        message:
          format === "duo"
            ? `تم إنشاء ${input.name} بـ ${participants.length} فريق`
            : `تم إنشاء ${input.name} بـ ${participants.length} لاعب`,
        type: "tournament",
      });
    },
    [addNotification, players, storageMode, tournaments],
  );

  const createRegistrationLink = useCallback(
    async (input: {
      title: string;
      format: TournamentFormat;
      size?: number;
      registrationEndsAt?: string;
      placement?: RegistrationPlacement;
    }) => {
      const format: TournamentFormat = input.format === "duo" ? "duo" : "solo";
      const size = Math.max(2, input.size ?? 32);
      const placement: RegistrationPlacement =
        input.placement === "home" || input.placement === "join"
          ? input.placement
          : "both";
      const taken = tournaments.flatMap((t) =>
        [t.id, t.shareCode].filter(Boolean) as string[],
      );
      const code = makeUniqueShareCode(taken, 4);
      const tournament: Tournament = {
        id: code,
        shareCode: code,
        name: input.title.trim() || "رابط تسجيل",
        image: "/logo.png",
        game: "other",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        participants: [],
        teams: format === "duo" ? [] : undefined,
        format,
        registrationOnly: true,
        registrationPlacement: placement,
        size,
        status: "upcoming",
        description: "رابط تسجيل يوزرات — منفصل عن البطولة.",
        registrationOpen: true,
        registrationEndsAt: input.registrationEndsAt || undefined,
        pendingRegistrations: [],
        bracket: createBracket(size, []),
      };

      recentCreatedIdsRef.current.set(code, Date.now());
      deletedIdsRef.current.delete(code);
      setTournaments((prev) => [tournament, ...prev]);

      if (storageMode === "supabase") {
        try {
          const res = await fetch("/api/tournaments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ tournament }),
          });
          const json = await res.json();
          if (!json?.ok) {
            return {
              id: code,
              urlPath: registrationSharePath(tournament),
              error: json?.error || "تعذر حفظ الرابط على السيرفر",
            };
          }
        } catch {
          return {
            id: code,
            urlPath: registrationSharePath(tournament),
            error: "تعذر الاتصال بالسيرفر",
          };
        }
      }

      addNotification({
        title: "رابط تسجيل جديد",
        message:
          format === "duo"
            ? `سجّل مع شريكك في ${tournament.name}`
            : `سجّل يوزرك في ${tournament.name}`,
        type: "tournament",
      });
      return {
        id: code,
        urlPath: registrationSharePath(tournament),
      };
    },
    [addNotification, tournaments, storageMode],
  );

  const deleteRegistrationLink = useCallback(
    async (tournamentId: string) => {
      deletedIdsRef.current.add(tournamentId);
      recentCreatedIdsRef.current.delete(tournamentId);
      setTournaments((prev) => prev.filter((t) => t.id !== tournamentId));

      if (storageMode === "supabase") {
        try {
          const res = await fetch("/api/tournaments", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ id: tournamentId }),
          });
          const json = await res.json();
          if (!json?.ok) {
            deletedIdsRef.current.delete(tournamentId);
            return {
              ok: false,
              error: json?.error || "فشل الحذف على السيرفر",
            };
          }
        } catch {
          deletedIdsRef.current.delete(tournamentId);
          return { ok: false, error: "تعذر الاتصال بالسيرفر" };
        }
      }

      return { ok: true };
    },
    [storageMode],
  );

  const createTournamentFromRegistration = useCallback(
    (registrationId: string, options?: { name?: string }) => {
      const source = tournaments.find((t) => t.id === registrationId);
      if (!source) return { ok: false, error: "رابط التسجيل غير موجود" };
      if (!source.registrationOnly) {
        return { ok: false, error: "هذا الخيار لروابط التسجيل فقط" };
      }

      const format = getTournamentFormat(source);
      const pending = source.pendingRegistrations ?? [];
      const createdPlayers: Player[] = [];

      const resolveOrCreate = (username: string, userId?: string): Player => {
        let player = players.find(
          (p) =>
            p.id === userId ||
            p.username.toLowerCase() === username.toLowerCase(),
        );
        if (!player) {
          player = createEmptyPlayer(
            username.trim(),
            `temp-${Math.random().toString(36).slice(2, 10)}`,
            "/logo.png",
          );
          createdPlayers.push(player);
        }
        return player;
      };

      let participants: string[] = [];
      let teams: TournamentTeam[] | undefined;

      if (format === "duo") {
        teams = [...(source.teams ?? [])];
        participants = [...source.participants];

        for (const req of pending) {
          const mateName = (req.teammateUsername || "").trim();
          const mate2Name = (req.teammate2Username || "").trim();
          if (!mateName) continue;
          const p1 = resolveOrCreate(req.username, req.userId);
          const p2 = resolveOrCreate(mateName, req.teammateUserId);
          const p3 = mate2Name
            ? resolveOrCreate(mate2Name, req.teammate2UserId)
            : undefined;
          const ids = [p1.id, p2.id, p3?.id].filter(Boolean) as string[];
          const already = teams.some(
            (team) =>
              participants.includes(team.id) &&
              ids.some(
                (id) =>
                  team.player1Id === id ||
                  team.player2Id === id ||
                  team.player3Id === id,
              ),
          );
          if (already) continue;
          const team: TournamentTeam = {
            id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            player1Id: p1.id,
            player2Id: p2.id,
            player3Id: p3?.id,
            name: [p1.username, p2.username, p3?.username]
              .filter(Boolean)
              .join(" + "),
          };
          teams.push(team);
          participants.push(team.id);
        }
      } else {
        participants = [...source.participants];
        for (const req of pending) {
          const p1 = resolveOrCreate(req.username, req.userId);
          if (!participants.includes(p1.id)) participants.push(p1.id);
        }
      }

      const needed = Math.max(2, source.size || 2);
      // القرعة تُبنى على العدد المسجّل فعلياً (مو حجم رابط التسجيل)
      if (participants.length < 2) {
        return {
          ok: false,
          error: `لازم على الأقل 2 ${
            format === "duo" ? "فريق" : "لاعب"
          } لإنشاء القرعة`,
        };
      }
      if (participants.length < needed) {
        return {
          ok: false,
          error: `يجب اكتمال العدد الأدنى: ${participants.length}/${needed} ${
            format === "duo" ? "فريق" : "لاعب"
          }`,
        };
      }

      // كل المسجّلين يدخلون القرعة — الشجرة بحجمهم بدون خانات زيادة فاضية
      const selected = participants;
      const selectedTeams =
        format === "duo"
          ? (teams ?? []).filter((team) => selected.includes(team.id))
          : undefined;
      const registeredCount = selected.length;
      const bracketSize = nextPowerOfTwo(registeredCount);
      const taken = tournaments.flatMap((t) =>
        [t.id, t.shareCode].filter(Boolean) as string[],
      );
      const code = makeUniqueShareCode(taken, 4);
      const id = `t-${Date.now()}`;
      const name =
        options?.name?.trim() ||
        source.name.replace(/^تسجيل\s*/i, "").trim() ||
        source.name;
      const tournamentName = name.includes("بطولة")
        ? name
        : `بطولة ${name}`;
      const overflow = Math.max(0, registeredCount - needed);

      const tournament: Tournament = {
        id,
        shareCode: code,
        name: tournamentName,
        image: "/logo.png",
        game: source.game || "other",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        participants: selected,
        teams: format === "duo" ? selectedTeams : undefined,
        format,
        // الحجم = عدد المسجّلين الفعلي (مو 8/16 فارغة)
        size: registeredCount,
        status: "upcoming",
        description:
          `أُنشئت تلقائياً من رابط التسجيل: ${source.name}` +
          ` · قرعة ${registeredCount} ${format === "duo" ? "فريق" : "لاعب"}` +
          (bracketSize > registeredCount
            ? ` (شجرة ${bracketSize} مع تأهيل مباشر للباقي)`
            : "") +
          (overflow > 0
            ? ` · شملت ${overflow} زيادة فوق المطلوب (${needed})`
            : ""),
        registrationOpen: false,
        registrationOnly: false,
        pendingRegistrations: [],
        bracket: createBracket(registeredCount, selected, { shuffle: true }),
        bracketUpdatedAt: new Date().toISOString(),
      };

      if (createdPlayers.length) {
        setPlayers((prev) => [...prev, ...createdPlayers]);
      }

      recentCreatedIdsRef.current.set(id, Date.now());
      recentLocalEditsRef.current.set(id, Date.now());

      // بطولة جديدة ظاهرة في قائمة البطولات + قفل رابط التسجيل
      setTournaments((prev) => [
        tournament,
        ...prev.map((t) =>
          t.id === registrationId
            ? {
                ...t,
                registrationOpen: false,
                pendingRegistrations: [],
                participants: [],
                teams: format === "duo" ? [] : undefined,
              }
            : t,
        ),
      ]);

      if (storageMode === "supabase") {
        void fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ tournament }),
        });
        void fetch("/api/registrations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            tournamentId: registrationId,
            pendingRegistrations: [],
            registrationOpen: false,
          }),
        });
      }

      addNotification({
        title: "بطولة جديدة جاهزة",
        message:
          `تم إنشاء ${tournamentName} بقرعة ${registeredCount}` +
          (overflow > 0 ? ` (شملت ${overflow} زيادة)` : "") +
          " — ظاهرة في البطولات",
        type: "tournament",
      });

      return {
        ok: true,
        tournamentId: id,
        path: tournamentSharePath(tournament),
      };
    },
    [tournaments, players, addNotification, storageMode],
  );

  const updateRegistrationCapacity = useCallback(
    async (registrationId: string, size: number) => {
      const nextSize = Math.max(2, Math.floor(size) || 2);
      const source = tournaments.find((t) => t.id === registrationId);
      if (!source) return { ok: false, error: "رابط التسجيل غير موجود" };
      if (!source.registrationOnly) {
        return { ok: false, error: "هذا الخيار لروابط التسجيل فقط" };
      }

      const updated: Tournament = {
        ...source,
        size: nextSize,
        registrationOpen: true,
      };

      setTournaments((prev) =>
        prev.map((t) => (t.id === registrationId ? updated : t)),
      );

      if (storageMode === "supabase") {
        try {
          const res = await fetch("/api/tournaments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ tournament: updated }),
          });
          const json = await res.json();
          if (!json?.ok) {
            return { ok: false, error: json?.error || "فشل تحديث العدد" };
          }
          if (json.tournament) {
            setTournaments((prev) =>
              prev.map((t) =>
                t.id === registrationId
                  ? {
                      ...t,
                      ...json.tournament,
                      id: t.id,
                      pendingRegistrations:
                        json.tournament.pendingRegistrations ??
                        t.pendingRegistrations,
                    }
                  : t,
              ),
            );
          }
        } catch {
          return { ok: false, error: "تعذر الاتصال بالسيرفر" };
        }
      }

      return { ok: true };
    },
    [tournaments, storageMode],
  );

  const submitRegistration = useCallback(
    async (
      tournamentId: string,
      input: {
        username: string;
        teammateUsername?: string;
        teammate2Username?: string;
      },
    ) => {
      const name = input.username.trim();
      if (!name || name.length < 2) {
        return { ok: false, error: "اختر يوزر Plato صحيح" };
      }

      const tournament = tournaments.find((t) => t.id === tournamentId);
      if (!tournament) return { ok: false, error: "البطولة غير موجودة" };
      if (!isRegistrationOpen(tournament)) {
        if (
          tournament.registrationOpen &&
          tournament.registrationEndsAt &&
          new Date(tournament.registrationEndsAt).getTime() <= Date.now()
        ) {
          setTournaments((prev) =>
            prev.map((t) =>
              t.id === tournamentId ? { ...t, registrationOpen: false } : t,
            ),
          );
        }
        return {
          ok: false,
          error: "التسجيل مغلق أو انتهى وقت التسجيل لهذه البطولة",
        };
      }

      const format = getTournamentFormat(tournament);
      const teammate = (input.teammateUsername || "").trim();

      if (format === "duo") {
        if (!teammate || teammate.length < 2) {
          return { ok: false, error: "اختر أو اكتب يوزر شريكك" };
        }
        if (teammate.toLowerCase() === name.toLowerCase()) {
          return { ok: false, error: "لا يجوز تكرار اليوزر نفسه في التيم" };
        }
      }

      const pending = tournament.pendingRegistrations ?? [];
      const namesInPending = (r: (typeof pending)[number]) =>
        [r.username, r.teammateUsername, r.teammate2Username]
          .filter(Boolean)
          .map((x) => x!.toLowerCase());

      const checkTaken = (u: string) => {
        const lower = u.toLowerCase();
        const hit = pending.find((r) => namesInPending(r).includes(lower));
        if (hit) {
          const others = [hit.username, hit.teammateUsername, hit.teammate2Username]
            .filter((x) => x && x.toLowerCase() !== lower)
            .join(" و ");
          return others
            ? `هذا الشخص مسجّل في البطولة مع ${others}`
            : "هذا اليوزر مسجّل مسبقاً في البطولة";
        }
        const existing = players.find((p) => p.username.toLowerCase() === lower);
        if (!existing) return null;
        if (format === "duo") {
          const inTeam = (tournament.teams ?? []).some(
            (team) =>
              tournament.participants.includes(team.id) &&
              (team.player1Id === existing.id ||
                team.player2Id === existing.id ||
                team.player3Id === existing.id),
          );
          if (inTeam) return "هذا اليوزر مضاف أصلاً في البطولة";
        } else if (tournament.participants.includes(existing.id)) {
          return "هذا اليوزر مضاف أصلاً في البطولة";
        }
        return null;
      };

      const submitting = format === "duo" ? [name, teammate] : [name];
      for (const u of submitting) {
        if (/\s/.test(u) || u.length > 32) {
          return {
            ok: false,
            error: `اليوزر ${u} غير صالح — بدون مسافات وبحد أقصى 32 حرف`,
          };
        }
        const err = checkTaken(u);
        if (err) return { ok: false, error: err };
      }

      const resolveLocalPlayer = (username: string) => {
        const found = players.find(
          (p) => p.username.toLowerCase() === username.toLowerCase(),
        );
        if (found) return { player: found, created: false as const };
        const player = createEmptyPlayer(username, "", "/logo.png");
        player.unclaimed = true;
        player.badges = ["عضو جديد"];
        return { player, created: true as const };
      };

      const existingPlayer = players.find(
        (p) => p.username.toLowerCase() === name.toLowerCase(),
      );
      const existingTeammate =
        format === "duo"
          ? players.find((p) => p.username.toLowerCase() === teammate.toLowerCase())
          : undefined;
      if (storageMode === "supabase") {
        try {
          const res = await fetch("/api/registrations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              tournamentId,
              username: name,
              teammateUsername: format === "duo" ? teammate : undefined,
              userId: existingPlayer?.id,
              teammateUserId: existingTeammate?.id,
            }),
          });
          const json = await res.json();
          if (!json?.ok) {
            return { ok: false, error: json?.error || "فشل التسجيل على السيرفر" };
          }
          const updated = json.tournament as Tournament | undefined;
          const pendingList =
            (json.pendingRegistrations as Tournament["pendingRegistrations"]) ||
            updated?.pendingRegistrations;
          setTournaments((prev) =>
            prev.map((t) =>
              t.id === tournamentId ||
              (updated && t.id === updated.id) ||
              t.shareCode === tournamentId
                ? {
                    ...t,
                    ...(updated || {}),
                    id: t.id,
                    pendingRegistrations:
                      pendingList ?? t.pendingRegistrations,
                    registrationOpen:
                      updated?.registrationOpen ?? t.registrationOpen,
                  }
                : t,
            ),
          );
          const created = Array.isArray(json.createdProfiles)
            ? (json.createdProfiles as {
                id: string;
                username: string;
                avatar?: string;
                unclaimed?: boolean;
              }[])
            : [];
          if (created.length) {
            setPlayers((prev) => {
              const keys = new Set(prev.map((p) => p.username.toLowerCase()));
              const next = [...prev];
              for (const row of created) {
                if (keys.has(row.username.toLowerCase())) continue;
                const p = createEmptyPlayer(
                  row.username,
                  "",
                  row.avatar || "/logo.png",
                );
                p.id = row.id;
                p.unclaimed = true;
                p.badges = ["عضو جديد"];
                next.push(p);
                keys.add(row.username.toLowerCase());
              }
              return next;
            });
          }
          addNotification({
            title: "طلب تسجيل جديد",
            message:
              format === "duo"
                ? `${name} + ${teammate} سجّلوا في ${tournament.name}`
                : `${name} سجّل في ${tournament.name}`,
            type: "tournament",
          });
          return { ok: true };
        } catch {
          return { ok: false, error: "تعذر الاتصال بالسيرفر، حاول مرة أخرى" };
        }
      }

      const mainLocal = resolveLocalPlayer(name);
      const mateLocal =
        format === "duo" ? resolveLocalPlayer(teammate) : null;
      const newLocals = [mainLocal, mateLocal].filter(
        (x): x is { player: Player; created: true } =>
          Boolean(x && x.created),
      );
      if (newLocals.length) {
        setPlayers((prev) => {
          const keys = new Set(prev.map((p) => p.username.toLowerCase()));
          const next = [...prev];
          for (const row of newLocals) {
            if (keys.has(row.player.username.toLowerCase())) continue;
            next.push(row.player);
            keys.add(row.player.username.toLowerCase());
          }
          return next;
        });
      }

      const request = {
        id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username: mainLocal.player.username,
        userId: mainLocal.player.id,
        teammateUsername: format === "duo" ? mateLocal?.player.username : undefined,
        teammateUserId: format === "duo" ? mateLocal?.player.id : undefined,
        createdAt: new Date().toISOString(),
      };

      setTournaments((prev) =>
        prev.map((t) => {
          if (t.id !== tournamentId) return t;
          const nextPending = [request, ...(t.pendingRegistrations ?? [])];
          return {
            ...t,
            pendingRegistrations: nextPending,
          };
        }),
      );

      addNotification({
        title: "طلب تسجيل جديد",
        message:
          format === "duo"
            ? `${name} + ${teammate} سجّلوا في ${tournament.name}`
            : `${name} سجّل في ${tournament.name}`,
        type: "tournament",
      });

      return { ok: true };
    },
    [tournaments, players, addNotification, storageMode],
  );

  const approveRegistration = useCallback(
    async (tournamentId: string, requestId: string) => {
      const tournament = tournaments.find((t) => t.id === tournamentId);
      if (!tournament) return { ok: false, error: "البطولة غير موجودة" };
      const request = (tournament.pendingRegistrations ?? []).find(
        (r) => r.id === requestId,
      );
      if (!request) return { ok: false, error: "طلب التسجيل غير موجود" };

      if (tournament.participants.length >= tournament.size) {
        return { ok: false, error: "اكتمل عدد المشاركين" };
      }

      const format = getTournamentFormat(tournament);
      const createdPlayers: Player[] = [];

      const resolveOrCreate = (
        username: string,
        userId?: string,
      ): Player => {
        let player = players.find(
          (p) =>
            p.id === userId ||
            p.username.toLowerCase() === username.toLowerCase(),
        );
        if (!player) {
          player = createEmptyPlayer(
            username,
            `temp-${Math.random().toString(36).slice(2, 10)}`,
            "/logo.png",
          );
          createdPlayers.push(player);
        }
        return player;
      };

      const removePendingOnServer = () => {
        if (storageMode !== "supabase") return;
        void fetch("/api/registrations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ tournamentId, requestId }),
        });
      };

      const player1 = resolveOrCreate(request.username, request.userId);

      if (format === "duo") {
        const mateName = (request.teammateUsername || "").trim();
        const mate2Name = (request.teammate2Username || "").trim();
        if (!mateName) {
          return { ok: false, error: "طلب التسجيل ناقص أعضاء التيم" };
        }
        const player2 = resolveOrCreate(mateName, request.teammateUserId);
        const player3 = mate2Name
          ? resolveOrCreate(mate2Name, request.teammate2UserId)
          : undefined;
        const memberIds = [player1.id, player2.id, player3?.id].filter(
          Boolean,
        ) as string[];

        const alreadyIn = (tournament.teams ?? []).some(
          (team) =>
            tournament.participants.includes(team.id) &&
            memberIds.some(
              (id) =>
                team.player1Id === id ||
                team.player2Id === id ||
                team.player3Id === id,
            ),
        );
        if (alreadyIn) {
          setTournaments((prev) =>
            prev.map((t) =>
              t.id === tournamentId
                ? {
                    ...t,
                    pendingRegistrations: (t.pendingRegistrations ?? []).filter(
                      (r) => r.id !== requestId,
                    ),
                  }
                : t,
            ),
          );
          removePendingOnServer();
          return { ok: false, error: "أحد اللاعبين مضاف مسبقاً" };
        }

        const team: TournamentTeam = {
          id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          player1Id: player1.id,
          player2Id: player2.id,
          player3Id: player3?.id,
          name: [player1.username, player2.username, player3?.username]
            .filter(Boolean)
            .join(" + "),
        };
        const nextParticipants = [...tournament.participants, team.id];
        const rewardIds = memberIds;

        if (createdPlayers.length) {
          setPlayers((prev) => [...prev, ...createdPlayers]);
        }

        setTournaments((prev) =>
          prev.map((t) => {
            if (t.id !== tournamentId) return t;
            const placed =
              placeEntryInBracket(t.bracket, team.id) ??
              createBracket(nextParticipants.length, nextParticipants, {
                shuffle: false,
              });
            return withBracketTimestamp({
              ...t,
              participants: nextParticipants,
              size: nextParticipants.length,
              teams: [...(t.teams ?? []), team],
              pendingRegistrations: (t.pendingRegistrations ?? []).filter(
                (r) => r.id !== requestId,
              ),
              bracket: placed,
            });
          }),
        );

        playersDirtyRef.current = true;
        setPlayers((prev) =>
          prev.map((p) => {
            if (!rewardIds.includes(p.id)) return p;
            const rewarded = rewardPlayer(
              p,
              POINT_REWARDS.joinTournament.rank,
              POINT_REWARDS.joinTournament.coins,
              5,
            );
            return {
              ...rewarded,
              tournamentsPlayed: rewarded.tournamentsPlayed + 1,
              recentTournaments: [
                tournamentId,
                ...rewarded.recentTournaments,
              ].slice(0, 8),
              stats: {
                ...rewarded.stats,
                tournaments: rewarded.stats.tournaments + 1,
              },
            };
          }),
        );

        addNotification({
          title: "تمت إضافة فريق",
          message: `أُضيف ${team.name} إلى ${tournament.name}`,
          type: "tournament",
        });

        removePendingOnServer();
        return { ok: true };
      }

      if (tournament.participants.includes(player1.id)) {
        setTournaments((prev) =>
          prev.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  pendingRegistrations: (t.pendingRegistrations ?? []).filter(
                    (r) => r.id !== requestId,
                  ),
                }
              : t,
          ),
        );
        removePendingOnServer();
        return { ok: false, error: "اللاعب مضاف مسبقاً" };
      }

      const nextParticipants = [...tournament.participants, player1.id];
      const playerId = player1.id;

      if (createdPlayers.length) {
        setPlayers((prev) => [...prev, ...createdPlayers]);
      }

      setTournaments((prev) =>
        prev.map((t) => {
          if (t.id !== tournamentId) return t;
          const placed =
            placeEntryInBracket(t.bracket, player1.id) ??
            createBracket(nextParticipants.length, nextParticipants, {
              shuffle: false,
            });
          return withBracketTimestamp({
            ...t,
            participants: nextParticipants,
            size: nextParticipants.length,
            pendingRegistrations: (t.pendingRegistrations ?? []).filter(
              (r) => r.id !== requestId,
            ),
            bracket: placed,
          });
        }),
      );

      playersDirtyRef.current = true;
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== playerId) return p;
          const rewarded = rewardPlayer(
            p,
            POINT_REWARDS.joinTournament.rank,
            POINT_REWARDS.joinTournament.coins,
            5,
          );
          return {
            ...rewarded,
            tournamentsPlayed: rewarded.tournamentsPlayed + 1,
            recentTournaments: [
              tournamentId,
              ...rewarded.recentTournaments,
            ].slice(0, 8),
            stats: {
              ...rewarded.stats,
              tournaments: rewarded.stats.tournaments + 1,
            },
          };
        }),
      );

      addNotification({
        title: "تمت إضافة لاعب",
        message: `أُضيف ${request.username} إلى ${tournament.name}`,
        type: "tournament",
      });

      removePendingOnServer();
      return { ok: true };
    },
    [tournaments, players, addNotification, storageMode],
  );

  const rejectRegistration = useCallback(
    async (tournamentId: string, requestId: string) => {
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === tournamentId
            ? {
                ...t,
                pendingRegistrations: (t.pendingRegistrations ?? []).filter(
                  (r) => r.id !== requestId,
                ),
              }
            : t,
        ),
      );

      if (storageMode === "supabase") {
        try {
          const res = await fetch("/api/registrations", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ tournamentId, requestId }),
          });
          const json = await res.json();
          if (!json?.ok) {
            return { ok: false, error: json?.error || "فشل الحذف على السيرفر" };
          }
          if (Array.isArray(json.pendingRegistrations)) {
            setTournaments((prev) =>
              prev.map((t) =>
                t.id === tournamentId
                  ? { ...t, pendingRegistrations: json.pendingRegistrations }
                  : t,
              ),
            );
          }
        } catch {
          return { ok: false, error: "تعذر الاتصال بالسيرفر" };
        }
      }

      return { ok: true };
    },
    [storageMode],
  );

  const updatePendingRegistration = useCallback(
    async (
      tournamentId: string,
      requestId: string,
      input: {
        username: string;
        teammateUsername?: string;
        teammate2Username?: string;
      },
    ) => {
      const tournament = tournaments.find((t) => t.id === tournamentId);
      if (!tournament) return { ok: false, error: "البطولة غير موجودة" };

      const name = input.username.trim();
      if (!name || name.length < 2) {
        return { ok: false, error: "اختر يوزر Plato صحيح" };
      }

      const format = getTournamentFormat(tournament);
      const teammate = (input.teammateUsername || "").trim();
      const teammate2 = (input.teammate2Username || "").trim();

      if (format === "duo") {
        if (!teammate || teammate.length < 2) {
          return { ok: false, error: "اختر أو اكتب يوزر شريك التيم" };
        }
        if (teammate.toLowerCase() === name.toLowerCase()) {
          return { ok: false, error: "لا يجوز تكرار اليوزر نفسه في التيم" };
        }
      }

      const pending = tournament.pendingRegistrations ?? [];
      const submitting =
        format === "duo"
          ? [name, teammate, ...(teammate2 ? [teammate2] : [])]
          : [name];
      for (const u of submitting) {
        if (/\s/.test(u) || u.length > 32) {
          return {
            ok: false,
            error: `اليوزر ${u} غير صالح — بدون مسافات وبحد أقصى 32 حرف`,
          };
        }
        const lower = u.toLowerCase();
        const hit = pending.find(
          (r) =>
            r.id !== requestId &&
            [r.username, r.teammateUsername, r.teammate2Username]
              .filter(Boolean)
              .some((x) => x!.toLowerCase() === lower),
        );
        if (hit) {
          return {
            ok: false,
            error: `اليوزر ${u} مسجّل مسبقاً في البطولة مع شخص آخر`,
          };
        }
      }

      if (storageMode === "supabase") {
        try {
          const res = await fetch("/api/registrations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              tournamentId,
              requestId,
              username: name,
              teammateUsername: format === "duo" ? teammate : undefined,
              teammate2Username:
                format === "duo" && teammate2 ? teammate2 : undefined,
            }),
          });
          const json = await res.json();
          if (!json?.ok) {
            return { ok: false, error: json?.error || "فشل التعديل على السيرفر" };
          }
          const updated = json.tournament as Tournament | undefined;
          const pendingList =
            (json.pendingRegistrations as Tournament["pendingRegistrations"]) ||
            updated?.pendingRegistrations;
          setTournaments((prev) =>
            prev.map((t) =>
              t.id === tournamentId || (updated && t.id === updated.id)
                ? {
                    ...t,
                    ...(updated || {}),
                    id: t.id,
                    pendingRegistrations:
                      pendingList ?? t.pendingRegistrations,
                  }
                : t,
            ),
          );
          const created = Array.isArray(json.createdProfiles)
            ? (json.createdProfiles as {
                id: string;
                username: string;
                avatar?: string;
              }[])
            : [];
          if (created.length) {
            setPlayers((prev) => {
              const keys = new Set(prev.map((p) => p.username.toLowerCase()));
              const next = [...prev];
              for (const row of created) {
                if (keys.has(row.username.toLowerCase())) continue;
                const p = createEmptyPlayer(
                  row.username,
                  "",
                  row.avatar || "/logo.png",
                );
                p.id = row.id;
                p.unclaimed = true;
                p.badges = ["عضو جديد"];
                next.push(p);
                keys.add(row.username.toLowerCase());
              }
              return next;
            });
          }
          return { ok: true };
        } catch {
          return { ok: false, error: "تعذر الاتصال بالسيرفر" };
        }
      }

      const resolveLocal = (username: string) => {
        const found = players.find(
          (p) => p.username.toLowerCase() === username.toLowerCase(),
        );
        if (found) return found;
        return createEmptyPlayer(username, "", "/logo.png");
      };
      const main = resolveLocal(name);
      const mate = format === "duo" ? resolveLocal(teammate) : null;
      const mate2 =
        format === "duo" && teammate2 ? resolveLocal(teammate2) : null;
      const locals = [main, mate, mate2].filter(Boolean) as Player[];
      setPlayers((prev) => {
        const keys = new Set(prev.map((p) => p.username.toLowerCase()));
        const next = [...prev];
        for (const p of locals) {
          if (keys.has(p.username.toLowerCase())) continue;
          p.unclaimed = true;
          next.push(p);
          keys.add(p.username.toLowerCase());
        }
        return next;
      });
      setTournaments((prev) =>
        prev.map((t) => {
          if (t.id !== tournamentId) return t;
          return {
            ...t,
            pendingRegistrations: (t.pendingRegistrations ?? []).map((r) =>
              r.id === requestId
                ? {
                    ...r,
                    username: main.username,
                    userId: main.id,
                    teammateUsername:
                      format === "duo" ? mate?.username : undefined,
                    teammateUserId: format === "duo" ? mate?.id : undefined,
                    teammate2Username:
                      format === "duo" && mate2 ? mate2.username : undefined,
                    teammate2UserId:
                      format === "duo" && mate2 ? mate2.id : undefined,
                  }
                : r,
            ),
          };
        }),
      );
      return { ok: true };
    },
    [tournaments, players, storageMode],
  );

  const persistTournament = useCallback(
    async (tournament: Tournament) => {
      recentLocalEditsRef.current.set(tournament.id, Date.now());
      setTournaments((prev) =>
        prev.map((t) => (t.id === tournament.id ? tournament : t)),
      );
      if (storageMode !== "supabase") return { ok: true as const };
      try {
        const res = await fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ tournament }),
        });
        const json = await res.json();
        if (!json?.ok) {
          return {
            ok: false as const,
            error: json?.error || "فشل حفظ البطولة على السيرفر",
          };
        }
        // ثبّت النسخة المحلية المرسلة — لا تخلط مع استجابة قديمة
        recentLocalEditsRef.current.set(tournament.id, Date.now());
        setTournaments((prev) =>
          prev.map((t) =>
            t.id === tournament.id
              ? {
                  ...tournament,
                  pendingRegistrations:
                    json.tournament?.pendingRegistrations ??
                    tournament.pendingRegistrations,
                  shareCode:
                    tournament.shareCode || json.tournament?.shareCode,
                  bracketUpdatedAt:
                    tournament.bracketUpdatedAt ||
                    json.tournament?.bracketUpdatedAt,
                }
              : t,
          ),
        );
        return { ok: true as const };
      } catch {
        return { ok: false as const, error: "تعذر الاتصال بالسيرفر" };
      }
    },
    [storageMode],
  );

  const redrawBracket = useCallback(
    async (tournamentId: string) => {
      const tournament = tournaments.find((t) => t.id === tournamentId);
      if (!tournament) return { ok: false, error: "البطولة غير موجودة" };
      if (tournament.registrationOnly) {
        return { ok: false, error: "رابط التسجيل ما عنده قرعة" };
      }
      if (!tournament.participants.length) {
        return { ok: false, error: "ما فيه مشاركين لإعادة السحب" };
      }

      const registeredCount = tournament.participants.length;
      const updated = withBracketTimestamp({
        ...tournament,
        size: registeredCount,
        bracket: createBracket(registeredCount, tournament.participants, {
          shuffle: true,
        }),
        championId: undefined,
        runnerUpId: undefined,
        topScorerId: undefined,
        bestPlayerId: undefined,
        bestGoalkeeperId: undefined,
        status: tournament.status === "finished" ? "ongoing" : tournament.status,
      });

      const saved = await persistTournament(updated);
      if (!saved.ok) return saved;
      addNotification({
        title: "إعادة سحب القرعة",
        message: `تم تحديث شجرة ${tournament.name}`,
        type: "tournament",
      });
      return { ok: true };
    },
    [tournaments, persistTournament, addNotification],
  );

  const finishTournament = useCallback(
    async (tournamentId: string) => {
      const tournament = tournaments.find((t) => t.id === tournamentId);
      if (!tournament) return { ok: false, error: "البطولة غير موجودة" };
      if (tournament.registrationOnly) {
        return { ok: false, error: "هذا رابط تسجيل وليس بطولة" };
      }
      if (tournament.status === "finished") {
        return { ok: false, error: "البطولة منتهية مسبقاً" };
      }

      const updated: Tournament = {
        ...tournament,
        status: "finished",
        registrationOpen: false,
      };

      const saved = await persistTournament(updated);
      if (!saved.ok) return saved;
      addNotification({
        title: "انتهت البطولة",
        message: `تم إنهاء ${tournament.name}`,
        type: "tournament",
      });
      return { ok: true };
    },
    [tournaments, persistTournament, addNotification],
  );

  const ensurePlayersByUsername = useCallback(
    async (usernames: string[]) => {
      const cleaned = usernames
        .map((u) => u.trim().replace(/^@/, ""))
        .filter((u) => u.length >= 2);
      if (!cleaned.length) {
        return {
          ok: false as const,
          error: "اكتب يوزر صحيح",
          players: [] as Player[],
        };
      }

      if (storageMode === "supabase") {
        try {
          const res = await fetch("/api/profiles/ensure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ usernames: cleaned }),
          });
          const json = await res.json();
          if (!json?.ok) {
            return {
              ok: false as const,
              error: json?.error || "فشل تجهيز الحساب",
              players: [] as Player[],
            };
          }
          const rows = (json.profiles || []) as {
            id: string;
            username: string;
            avatar?: string;
          }[];
          const resolved = rows.map((row) => {
            const p = createEmptyPlayer(
              row.username,
              "",
              row.avatar || "/logo.png",
            );
            p.id = row.id;
            p.unclaimed = true;
            p.badges = ["عضو جديد"];
            return p;
          });
          setPlayers((prev) => {
            const keys = new Set(prev.map((p) => p.username.toLowerCase()));
            const next = [...prev];
            for (const p of resolved) {
              if (keys.has(p.username.toLowerCase())) continue;
              next.push(p);
              keys.add(p.username.toLowerCase());
            }
            return next;
          });
          return { ok: true as const, players: resolved };
        } catch {
          return {
            ok: false as const,
            error: "تعذر الاتصال بالسيرفر",
            players: [] as Player[],
          };
        }
      }

      const resolved: Player[] = [];
      setPlayers((prev) => {
        const next = [...prev];
        for (const name of cleaned) {
          let found = next.find(
            (p) => p.username.toLowerCase() === name.toLowerCase(),
          );
          if (!found) {
            found = createEmptyPlayer(name, "", "/logo.png");
            found.unclaimed = true;
            found.badges = ["عضو جديد"];
            next.push(found);
          }
          resolved.push(found);
        }
        return next;
      });
      return { ok: true as const, players: resolved };
    },
    [storageMode],
  );

  const assignBracketSlot = useCallback(
    async (input: {
      tournamentId: string;
      matchId: string;
      side: 1 | 2;
      username?: string;
      teammateUsername?: string;
      advanceAfter?: boolean;
    }) => {
      const tournament = tournaments.find((t) => t.id === input.tournamentId);
      if (!tournament) return { ok: false, error: "البطولة غير موجودة" };
      if (tournament.status === "finished") {
        return { ok: false, error: "البطولة منتهية" };
      }
      let working = tournament;
      const match = working.bracket.find((m) => m.id === input.matchId);
      if (!match) return { ok: false, error: "المباراة غير موجودة" };

      const sideEmpty =
        input.side === 1 ? !match.player1Id : !match.player2Id;

      // خانة فاضية ضد خصم متأهل بباي → رجّع التأهيل أولاً ثم عبّئ
      if (match.winnerId) {
        if (!sideEmpty) {
          return {
            ok: false,
            error: "المباراة محسومة — ارجع النتيجة أولاً أو عدّل الخانة الفاضية",
          };
        }
        const reverted = withMatchRevert(working, input.matchId);
        if (!reverted.ok) return reverted;
        working = reverted.tournament;
      }

      const format = getTournamentFormat(working);
      if (format === "duo") {
        if (!input.username?.trim() || !input.teammateUsername?.trim()) {
          return { ok: false, error: "اختَر/اكتب عضوي التيم" };
        }
        if (
          input.username.trim().toLowerCase() ===
          input.teammateUsername.trim().toLowerCase()
        ) {
          return { ok: false, error: "التيم لازم شخصين مختلفين" };
        }
      } else if (!input.username?.trim()) {
        return { ok: false, error: "اختَر أو اكتب اليوزر" };
      }

      const names =
        format === "duo"
          ? [input.username!.trim(), input.teammateUsername!.trim()]
          : [input.username!.trim()];
      const ensured = await ensurePlayersByUsername(names);
      if (!ensured.ok) return { ok: false, error: ensured.error };
      const p1 = ensured.players[0];
      const p2 = ensured.players[1];
      if (!p1) return { ok: false, error: "تعذر تجهيز اللاعب" };
      if (format === "duo" && !p2) {
        return { ok: false, error: "تعذر تجهيز الشريك" };
      }

      let entryId = p1.id;
      const teams = working.teams ? [...working.teams] : [];
      const participants = [...working.participants];

      if (format === "duo" && p2) {
        const team: TournamentTeam = {
          id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          player1Id: p1.id,
          player2Id: p2.id,
          name: `${p1.username} + ${p2.username}`,
        };
        teams.push(team);
        entryId = team.id;
        if (!participants.includes(team.id)) participants.push(team.id);
      } else if (!participants.includes(p1.id)) {
        participants.push(p1.id);
      }

      let bracket = working.bracket.map((m) => ({ ...m }));
      const current = bracket.find((m) => m.id === input.matchId)!;
      const previousEntry =
        input.side === 1 ? current.player1Id : current.player2Id;

      // لو الخانة جاية من تأهيل سابق — ارجع المصدر عشان ما يرجع اليوزر القديم
      if (previousEntry && previousEntry !== entryId) {
        const source = findAdvanceSourceMatch(
          bracket,
          input.matchId,
          previousEntry,
        );
        if (source) {
          const cleared = withMatchRevert(
            { ...working, bracket },
            source.id,
          );
          if (cleared.ok) {
            working = cleared.tournament;
            bracket = working.bracket.map((m) => ({ ...m }));
          }
        }
      }

      const slot = bracket.find((m) => m.id === input.matchId)!;
      if (input.side === 1) slot.player1Id = entryId;
      else slot.player2Id = entryId;
      slot.score1 = null;
      slot.score2 = null;
      slot.winnerId = undefined;

      // لا تبقّي النسخة القديمة متأهلة للجولة التالية من هذي المباراة
      if (slot.nextMatchId && previousEntry && previousEntry !== entryId) {
        const nm = bracket.find((m) => m.id === slot.nextMatchId);
        if (nm && !nm.winnerId) {
          if (nm.player1Id === previousEntry) nm.player1Id = undefined;
          if (nm.player2Id === previousEntry) nm.player2Id = undefined;
        }
      }

      let updated: Tournament = withBracketTimestamp({
        ...working,
        teams: format === "duo" ? teams : working.teams,
        participants,
        bracket,
        status:
          working.status === "upcoming" ? "ongoing" : working.status,
      });

      if (input.advanceAfter) {
        const cur = updated.bracket.find((m) => m.id === input.matchId)!;
        const otherId = input.side === 1 ? cur.player2Id : cur.player1Id;
        const hasOpponent = Boolean(otherId && otherId !== entryId);
        updated = withMatchResult(
          updated,
          input.matchId,
          entryId,
          input.side === 1 ? (hasOpponent ? 5 : 1) : 0,
          input.side === 1 ? 0 : hasOpponent ? 5 : 1,
        );
      }

      const saved = await persistTournament(updated);
      if (!saved.ok) return saved;
      return { ok: true };
    },
    [tournaments, ensurePlayersByUsername, persistTournament],
  );

  const persistPlayersSnapshot = useCallback(
    (nextPlayers: Player[]) => {
      playersDirtyRef.current = true;
      playersRef.current = nextPlayers;
      if (storageMode !== "supabase") return;
      void fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ players: nextPlayers }),
      }).then((res) => {
        if (res.ok) {
          lastSyncHashRef.current = "";
          playersDirtyRef.current = false;
        }
      });
    },
    [storageMode],
  );

  const applyPlayerMatchRewards = useCallback(
    (
      tournament: Tournament,
      matchRound: number,
      winnerId: string,
      loserId: string,
      score1: number,
      score2: number,
      winnerIsPlayer1: boolean,
    ) => {
      const winnerPlayerIds = playerIdsForEntry(tournament, winnerId);
      const loserPlayerIds = playerIdsForEntry(tournament, loserId);
      const totalRounds = Math.max(...tournament.bracket.map((m) => m.round), 1);
      const winnerGoals = winnerIsPlayer1 ? score1 : score2;
      const loserGoals = winnerIsPlayer1 ? score2 : score1;

      setPlayers((prev) => {
        const winReward = pointsForMatchResult(true, winnerGoals);
        const lossReward = pointsForMatchResult(false, loserGoals);

        const nextPlayers = prev.map((p) => {
          if (winnerPlayerIds.includes(p.id)) {
            let next = rewardPlayer(
              p,
              winReward.rank,
              winReward.coins,
              winReward.monthly,
            );
            next = {
              ...next,
              wins: next.wins + 1,
              matches: next.matches + 1,
              winRate: calcWinRate(next.wins + 1, next.losses),
              stats: {
                ...next.stats,
                wins: next.stats.wins + 1,
                matches: next.stats.matches + 1,
                winStreak: next.stats.winStreak + 1,
                goals: next.stats.goals + Math.max(0, winnerGoals),
                winRate: calcWinRate(next.stats.wins + 1, next.stats.losses),
              },
            };

            if (matchRound === totalRounds) {
              next = rewardPlayer(
                next,
                POINT_REWARDS.champion.rank,
                POINT_REWARDS.champion.coins,
                40,
              );
              next = {
                ...next,
                tournamentsWon: next.tournamentsWon + 1,
                monthlyAward: "أفضل لاعب في الشهر مرشح",
                stats: { ...next.stats, bestPlacement: 1 },
              };
            } else if (matchRound === totalRounds - 1) {
              next = rewardPlayer(
                next,
                POINT_REWARDS.reachFinal.rank,
                POINT_REWARDS.reachFinal.coins,
                15,
              );
            } else if (matchRound === totalRounds - 2) {
              next = rewardPlayer(
                next,
                POINT_REWARDS.reachSemifinal.rank,
                POINT_REWARDS.reachSemifinal.coins,
                8,
              );
            }
            return next;
          }

          if (loserPlayerIds.includes(p.id)) {
            let next = rewardPlayer(
              p,
              lossReward.rank,
              lossReward.coins,
              lossReward.monthly,
            );
            next = {
              ...next,
              losses: next.losses + 1,
              matches: next.matches + 1,
              winRate: calcWinRate(next.wins, next.losses + 1),
              stats: {
                ...next.stats,
                losses: next.stats.losses + 1,
                matches: next.stats.matches + 1,
                winStreak: 0,
                goals: next.stats.goals + Math.max(0, loserGoals),
                winRate: calcWinRate(next.stats.wins, next.stats.losses + 1),
              },
            };
            if (matchRound === totalRounds) {
              next = rewardPlayer(
                next,
                POINT_REWARDS.runnerUp.rank,
                POINT_REWARDS.runnerUp.coins,
                20,
              );
              next = {
                ...next,
                stats: { ...next.stats, bestPlacement: 2 },
              };
            }
            return next;
          }
          return p;
        });

        // حفظ فوري — قبل ما جهاز ثاني يرفع لقطة قديمة ويمسح النقاط
        if (winnerPlayerIds.length > 0 || loserPlayerIds.length > 0) {
          queueMicrotask(() => persistPlayersSnapshot(nextPlayers));
        }
        return nextPlayers;
      });
    },
    [persistPlayersSnapshot],
  );

  const recordMatchResult = useCallback(
    async (input: {
      tournamentId: string;
      matchId: string;
      score1: number;
      score2: number;
    }) => {
      const tournament = tournaments.find((t) => t.id === input.tournamentId);
      if (!tournament) return { ok: false, error: "البطولة غير موجودة" };
      const match = tournament.bracket.find((m) => m.id === input.matchId);
      if (!match?.player1Id || !match.player2Id) {
        return { ok: false, error: "المباراة غير جاهزة" };
      }
      if (match.winnerId) {
        return { ok: false, error: "المباراة محسومة مسبقاً" };
      }

      const check = validateFirstToFive(input.score1, input.score2);
      if (!check.ok) return check;

      const winnerId = winnerFromScores(match, input.score1, input.score2);
      if (!winnerId) return { ok: false, error: "تعذر تحديد الفائز" };
      const loserId =
        winnerId === match.player1Id ? match.player2Id : match.player1Id;

      const updated = withMatchResult(
        tournament,
        input.matchId,
        winnerId,
        input.score1,
        input.score2,
      );

      const saved = await persistTournament(updated);
      if (!saved.ok) return saved;

      applyPlayerMatchRewards(
        updated,
        match.round,
        winnerId,
        loserId,
        input.score1,
        input.score2,
        winnerId === match.player1Id,
      );

      addNotification({
        title: "نتيجة جديدة + نقاط",
        message: "تم تحديث الشجرة ومنح نقاط للمتأهل",
        type: "result",
      });

      return { ok: true };
    },
    [
      tournaments,
      persistTournament,
      applyPlayerMatchRewards,
      addNotification,
    ],
  );

  const advanceMatchWinner = useCallback(
    async (input: {
      tournamentId: string;
      matchId: string;
      winnerId: string;
      score1?: number;
      score2?: number;
    }) => {
      const tournament = tournaments.find((t) => t.id === input.tournamentId);
      if (!tournament) return { ok: false, error: "البطولة غير موجودة" };
      const match = tournament.bracket.find((m) => m.id === input.matchId);
      if (!match) return { ok: false, error: "المباراة غير موجودة" };
      if (match.winnerId) {
        return { ok: false, error: "المباراة محسومة مسبقاً" };
      }
      if (
        input.winnerId !== match.player1Id &&
        input.winnerId !== match.player2Id
      ) {
        return { ok: false, error: "الفائز لازم يكون من طرفي المباراة" };
      }
      if (!match.player1Id && !match.player2Id) {
        return { ok: false, error: "الخانة فاضية" };
      }

      const winnerIsP1 = input.winnerId === match.player1Id;
      const hasOpponent = Boolean(match.player1Id && match.player2Id);

      // بدون خصم = باي / تأهيل مباشر
      if (!hasOpponent) {
        const updated = withMatchResult(
          tournament,
          input.matchId,
          input.winnerId,
          winnerIsP1 ? 1 : 0,
          winnerIsP1 ? 0 : 1,
        );
        const saved = await persistTournament(updated);
        if (!saved.ok) return saved;
        addNotification({
          title: "تأهيل مباشر",
          message: "تم التأهيل بدون خصم للجولة التالية",
          type: "result",
        });
        return { ok: true };
      }

      const hasCustomScores = input.score1 != null || input.score2 != null;
      const finalScore1 = hasCustomScores
        ? Number(input.score1 ?? 0)
        : winnerIsP1
          ? 5
          : 0;
      const finalScore2 = hasCustomScores
        ? Number(input.score2 ?? 0)
        : winnerIsP1
          ? 0
          : 5;

      if (hasCustomScores) {
        const check = validateFirstToFive(finalScore1, finalScore2);
        if (!check.ok) return check;
        const fromScores = winnerFromScores(match, finalScore1, finalScore2);
        if (fromScores !== input.winnerId) {
          return {
            ok: false,
            error: "النتيجة ما تطابق اللاعب المختار للتأهيل",
          };
        }
      }

      const loserId = winnerIsP1 ? match.player2Id! : match.player1Id!;
      const updated = withMatchResult(
        tournament,
        input.matchId,
        input.winnerId,
        finalScore1,
        finalScore2,
      );

      const saved = await persistTournament(updated);
      if (!saved.ok) return saved;

      applyPlayerMatchRewards(
        updated,
        match.round,
        input.winnerId,
        loserId,
        finalScore1,
        finalScore2,
        winnerIsP1,
      );

      addNotification({
        title: "تأهيل من الشجرة + نقاط",
        message: "تم التأهيل ومنح نقاط للمتأهلين",
        type: "result",
      });

      return { ok: true };
    },
    [
      tournaments,
      persistTournament,
      applyPlayerMatchRewards,
      addNotification,
    ],
  );

  const revertMatchWinner = useCallback(
    async (input: { tournamentId: string; matchId: string }) => {
      const tournament = tournaments.find((t) => t.id === input.tournamentId);
      if (!tournament) return { ok: false, error: "البطولة غير موجودة" };
      const result = withMatchRevert(tournament, input.matchId);
      if (!result.ok) return result;

      const saved = await persistTournament(result.tournament);
      if (!saved.ok) return saved;

      addNotification({
        title: "إرجاع خطوة",
        message: "تم إرجاع التأهيل وإعادة الطرف لمكانه",
        type: "result",
      });
      return { ok: true };
    },
    [tournaments, persistTournament, addNotification],
  );

  const buyShopItem = useCallback(
    (itemId: string) => {
      if (!user) return { ok: false, error: "سجّل دخولك أولاً" };
      const item = getShopItem(itemId);
      if (!item) return { ok: false, error: "المنتج غير موجود" };
      const player = players.find((p) => p.id === user.id);
      if (!player) return { ok: false, error: "الحساب غير موجود" };
      if (player.inventory.includes(itemId)) {
        return { ok: false, error: "تملك هذا العنصر مسبقاً" };
      }
      if (player.coins < item.price) {
        return { ok: false, error: "رصيد العملات غير كافٍ" };
      }

      playersDirtyRef.current = true;
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === user.id
            ? {
                ...p,
                coins: p.coins - item.price,
                inventory: [...p.inventory, itemId],
                badges:
                  item.type === "badge"
                    ? [...new Set([...p.badges, item.name.replace("وسام ", "")])]
                    : p.badges,
              }
            : p,
        ),
      );
      addNotification({
        title: "عملية شراء ناجحة",
        message: `اشتريت ${item.name}`,
        type: "shop",
      });
      return { ok: true };
    },
    [user, players, addNotification],
  );

  const equipItem = useCallback(
    (itemId: string | null, slot: "frame" | "title" | "effect") => {
      if (!user) return;
      playersDirtyRef.current = true;
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== user.id) return p;
          if (itemId && !p.inventory.includes(itemId) && !SHOP_ITEMS.some((i) => i.id === itemId && p.inventory.includes(i.id))) {
            return p;
          }
          const equipped = { ...p.equipped };
          if (slot === "frame") equipped.frameId = itemId || undefined;
          if (slot === "title") equipped.titleId = itemId || undefined;
          if (slot === "effect") equipped.effectId = itemId || undefined;
          return { ...p, equipped };
        }),
      );
    },
    [user],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      ready,
      storageMode,
      user,
      players,
      tournaments,
      votes,
      news,
      notifications,
      hallOfFame,
      login: async (username, password, portal) => {
        if (!ready) return { ok: false, error: "انتظر لحظة... جاري التحميل" };
        const name = username.trim();
        if (storageMode === "supabase") {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: name, password, portal }),
          }).then((r) => r.json());
          if (!res.ok) return { ok: false, error: res.error };
          if (res.player) {
            const normalized = normalizePlayer(res.player as Player);
            setPlayers((prev) => {
              const idx = prev.findIndex((p) => p.id === normalized.id);
              if (idx === -1) return [...prev, normalized];
              const next = prev.slice();
              next[idx] = normalized;
              return next;
            });
            setUser({
              id: normalized.id,
              username: normalized.username,
              avatar: normalized.avatar,
              role: normalized.role,
            });
          } else {
            setUser(res.user);
          }
          syncEnabledRef.current = true;
          return { ok: true };
        }

        const found = players.find(
          (p) => p.username.toLowerCase() === name.toLowerCase(),
        );
        if (!found) return { ok: false, error: "اليوزر غير موجود" };
        if (found.password !== password)
          return { ok: false, error: "كلمة المرور غير صحيحة" };
        if (portal === "admin" && !isStaff(found.role)) {
          return { ok: false, error: "هذا الحساب ليس مشرفاً" };
        }
        setUser({
          id: found.id,
          username: found.username,
          avatar: found.avatar,
          role: found.role,
        });
        return { ok: true };
      },
      register: async ({ username, password, avatar }) => {
        if (!ready) return { ok: false, error: "انتظر لحظة... جاري التحميل" };
        if (storageMode === "supabase") {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: username.trim(),
              password,
              avatar,
            }),
          }).then((r) => r.json());
          if (!res.ok) return { ok: false, error: res.error };
          if (res.player) {
            const normalized = normalizePlayer(res.player as Player);
            setPlayers((prev) =>
              prev.some((p) => p.id === normalized.id)
                ? prev
                : [...prev, normalized],
            );
            setUser({
              id: normalized.id,
              username: normalized.username,
              avatar: normalized.avatar,
              role: normalized.role,
            });
          } else {
            setUser(res.user);
          }
          syncEnabledRef.current = true;
          return { ok: true };
        }

        const name = username.trim();
        if (!name || !password) {
          return { ok: false, error: "أدخل اليوزر وكلمة المرور" };
        }
        if (name.length < 2) {
          return { ok: false, error: "اليوزر قصير جداً" };
        }
        if (
          players.some((p) => p.username.toLowerCase() === name.toLowerCase())
        ) {
          return { ok: false, error: "اليوزر مستخدم مسبقاً" };
        }
        const newPlayer = createEmptyPlayer(name, password, avatar);
        setPlayers((prev) => [...prev, newPlayer]);
        setUser({
          id: newPlayer.id,
          username: newPlayer.username,
          avatar: newPlayer.avatar,
          role: newPlayer.role,
        });
        addNotification({
          title: "عضو جديد",
          message: `مرحباً ${name} — حصلت على 50 عملة للبداية`,
          type: "news",
        });
        return { ok: true };
      },
      claimAccount: async (username, password) => {
        if (!ready) return { ok: false, error: "انتظر لحظة... جاري التحميل" };
        if (storageMode !== "supabase") {
          return { ok: false, error: "تفعيل حسابات القروب يحتاج السيرفر" };
        }
        try {
          const res = await fetch("/api/auth/claim", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: username.trim(),
              password,
            }),
          }).then((r) => r.json());
          if (!res.ok) return { ok: false, error: res.error };
          if (res.player) {
            const normalized = normalizePlayer({
              ...(res.player as Player),
              unclaimed: false,
            });
            setPlayers((prev) => {
              const idx = prev.findIndex((p) => p.id === normalized.id);
              if (idx === -1) return [...prev, normalized];
              const next = [...prev];
              next[idx] = { ...prev[idx], ...normalized, unclaimed: false };
              return next;
            });
            setUser({
              id: normalized.id,
              username: normalized.username,
              avatar: normalized.avatar,
              role: normalized.role,
            });
          } else if (res.user) {
            setUser(res.user);
          }
          syncEnabledRef.current = true;
          return { ok: true };
        } catch {
          return { ok: false, error: "تعذر تفعيل الحساب" };
        }
      },
      logout: async () => {
        if (storageMode === "supabase") {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
          });
        }
        setUser(null);
        localStorage.removeItem(AUTH_KEY);
      },
      updateProfile: (data) => {
        if (!user) return;
        setUser((u) =>
          u
            ? {
                ...u,
                username: data.username ?? u.username,
                avatar: data.avatar ?? u.avatar,
              }
            : u,
        );
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === user.id
              ? {
                  ...p,
                  username: data.username ?? p.username,
                  avatar: data.avatar ?? p.avatar,
                  bio: data.bio ?? p.bio,
                }
              : p,
          ),
        );
      },
      getPlayer,
      setTournaments,
      setVotes,
      setNews,
      setPlayers,
      setNotifications,
      setHallOfFame,
      createTournament,
      createRegistrationLink,
      deleteRegistrationLink,
      createTournamentFromRegistration,
      updateRegistrationCapacity,
      submitRegistration,
      approveRegistration,
      rejectRegistration,
      updatePendingRegistration,
      recordMatchResult,
      advanceMatchWinner,
      revertMatchWinner,
      redrawBracket,
      finishTournament,
      assignBracketSlot,
      buyShopItem,
      equipItem,
      addNotification,
      resetStore: () => {
        const fresh = blankState();
        setPlayers(fresh.players);
        setTournaments([]);
        setVotes([]);
        setNews([]);
        setNotifications(fresh.notifications);
        setHallOfFame([]);
        setUser(null);
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(DATA_KEY);
      },
    }),
    [
      ready,
      storageMode,
      user,
      players,
      tournaments,
      votes,
      news,
      notifications,
      hallOfFame,
      getPlayer,
      createTournament,
      createRegistrationLink,
      deleteRegistrationLink,
      createTournamentFromRegistration,
      updateRegistrationCapacity,
      submitRegistration,
      approveRegistration,
      rejectRegistration,
      updatePendingRegistration,
      recordMatchResult,
      advanceMatchWinner,
      revertMatchWinner,
      redrawBracket,
      finishTournament,
      assignBracketSlot,
      buyShopItem,
      equipItem,
      addNotification,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
