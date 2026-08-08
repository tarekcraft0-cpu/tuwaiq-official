import {
  calcWinRate,
  comparePlayerOfMonth,
  rankFromPoints,
} from "@/lib/points";
import type { Player } from "./types";

export const STORE_VERSION = "tuwaiq-v1-platform";

export const gameLabels: Record<string, string> = {
  football: "كرة القدم",
  billiards: "البلياردو",
  tennis: "التنس",
  chess: "الشطرنج",
  other: "أخرى",
};

export const statusLabels = {
  upcoming: "قادمة",
  ongoing: "جارية",
  finished: "منتهية",
  pending: "لم تبدأ",
  live: "جارية",
} as const;

function baseStats(rankingPoints = 0) {
  return {
    goals: 0,
    assists: 0,
    tournaments: 0,
    wins: 0,
    losses: 0,
    matches: 0,
    winRate: 0,
    winStreak: 0,
    bestPlacement: 0,
    rankingPoints,
  };
}

export function createEmptyPlayer(
  username: string,
  password: string,
  avatar: string,
): Player {
  return {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    username,
    password,
    avatar: avatar || "/logo.png",
    role: "member",
    joinedAt: new Date().toISOString().slice(0, 10),
    rank: "مبتدئ",
    coins: 50,
    inventory: ["badge-founder"],
    equipped: {},
    tournamentsPlayed: 0,
    tournamentsWon: 0,
    winRate: 0,
    matches: 0,
    wins: 0,
    losses: 0,
    stats: baseStats(0),
    achievements: [],
    badges: ["عضو جديد", "الجيل الأول"],
    recentTournaments: [],
    monthlyScore: 0,
  };
}

export function normalizePlayer(p: Partial<Player> & { id: string; username: string }): Player {
  const base = createEmptyPlayer(
    p.username,
    p.password || "",
    p.avatar || "/logo.png",
  );
  const role = p.role ?? base.role;
  return {
    ...base,
    ...p,
    role,
    rank:
      role === "owner"
        ? "المالك"
        : role === "admin"
          ? "مشرف"
          : (p.rank ?? base.rank),
    coins: p.coins ?? 50,
    inventory: p.inventory ?? [],
    equipped: p.equipped ?? {},
    monthlyScore: p.monthlyScore ?? 0,
    stats: {
      ...baseStats(0),
      ...p.stats,
    },
  };
}

/** مقياس تقدّم اللاعب — يمنع مزامنة قديمة من مسح نقاط/انتصارات أحدث */
export function playerProgressScore(p: Player): number {
  const pts = p.stats?.rankingPoints ?? 0;
  const wins = Math.max(p.wins ?? 0, p.stats?.wins ?? 0);
  const matches = Math.max(p.matches ?? 0, p.stats?.matches ?? 0);
  const titles = p.tournamentsWon ?? 0;
  return pts * 100_000 + titles * 1_000 + matches * 10 + wins;
}

/**
 * دمج لاعبين: نأخذ أعلى نقاط/فوز/مباريات حتى لا يمسح عميل متأخر المكافآت.
 * الحقول التجميلية (أفتار، بايو) تُؤخذ من النسخة ذات التقدّم الأعلى.
 */
export function mergePlayersPreferProgress(a: Player, b: Player): Player {
  const aScore = playerProgressScore(a);
  const bScore = playerProgressScore(b);
  const primary = aScore >= bScore ? a : b;
  const secondary = aScore >= bScore ? b : a;

  const rankingPoints = Math.max(
    a.stats?.rankingPoints ?? 0,
    b.stats?.rankingPoints ?? 0,
  );
  const wins = Math.max(a.wins ?? 0, b.wins ?? 0, a.stats?.wins ?? 0, b.stats?.wins ?? 0);
  const losses = Math.max(
    a.losses ?? 0,
    b.losses ?? 0,
    a.stats?.losses ?? 0,
    b.stats?.losses ?? 0,
  );
  const matches = Math.max(
    a.matches ?? 0,
    b.matches ?? 0,
    a.stats?.matches ?? 0,
    b.stats?.matches ?? 0,
  );
  const tournamentsWon = Math.max(a.tournamentsWon ?? 0, b.tournamentsWon ?? 0);
  const goals = Math.max(a.stats?.goals ?? 0, b.stats?.goals ?? 0);
  const winStreak = primary.stats?.winStreak ?? 0;
  const bestPlacement = (() => {
    const vals = [a.stats?.bestPlacement, b.stats?.bestPlacement]
      .filter((x): x is number => typeof x === "number" && x > 0);
    return vals.length ? Math.min(...vals) : primary.stats?.bestPlacement ?? 0;
  })();

  return normalizePlayer({
    ...secondary,
    ...primary,
    coins: Math.max(a.coins ?? 0, b.coins ?? 0),
    monthlyScore: Math.max(a.monthlyScore ?? 0, b.monthlyScore ?? 0),
    wins,
    losses,
    matches,
    tournamentsWon,
    tournamentsPlayed: Math.max(a.tournamentsPlayed ?? 0, b.tournamentsPlayed ?? 0),
    winRate: calcWinRate(wins, losses),
    rank: rankFromPoints(rankingPoints),
    stats: {
      ...secondary.stats,
      ...primary.stats,
      rankingPoints,
      wins,
      losses,
      matches,
      goals,
      winStreak,
      bestPlacement,
      winRate: calcWinRate(wins, losses),
    },
  });
}

export const rules = [
  {
    title: "التسجيل",
    items: [
      "يجب أن يكون اليوزر نفس اسمك في لعبة Plato.",
      "للمشاركة في البطولة سجّل يوزرك من صفحة البطولة قبل إغلاق التسجيل.",
      "يُسمح بحساب واحد فقط لكل لاعب.",
    ],
  },
  {
    title: "المباريات",
    items: [
      "يجب الحضور خلال 10 دقائق من موعد المباراة.",
      "في حال التأخر يُحتسب انسحاباً فنياً.",
      "يُمنع استخدام أي أدوات غير مسموحة داخل Plato.",
    ],
  },
  {
    title: "نظام النقاط",
    items: [
      "المشاركة تمنحك نقاطاً وعملات طويق.",
      "الفوز يمنحك نقاط أساس، وكل هدف تسجله يزيد نقاطك.",
      "كل ما كثرت أهدافك ونصرك، ترتيبك أعلى — والبطل والوصيف لهم مكافأة إضافية.",
    ],
  },
  {
    title: "المتجر",
    items: [
      "العملات تُكتسب من المشاركة والنتائج.",
      "يمكنك شراء إطارات وألقاب وأوسمة تظهر على حسابك.",
      "التحسينات تجميلية داخل الموقع فقط.",
    ],
  },
  {
    title: "الاحترام والروح الرياضية",
    items: [
      "يُمنع السب أو الإساءة داخل المباراة أو الدردشة.",
      "قرارات الحكام والإداريين نهائية.",
      "اللعب النظيف أولوية قبل النتيجة.",
    ],
  },
];

export function getRankedPlayers(players: Player[]) {
  // يظهر الأعضاء والمشرفون — المشرف له شارة في الواجهة
  return [...players].sort(
    (a, b) => b.stats.rankingPoints - a.stats.rankingPoints,
  );
}

export function getLeaderboards(players: Player[]) {
  const roster = [...players];
  const ranked = getRankedPlayers(roster);
  return {
    champions: [...roster].sort((a, b) => b.tournamentsWon - a.tournamentsWon),
    scorers: [...roster].sort((a, b) => b.stats.goals - a.stats.goals),
    assisters: [...roster].sort((a, b) => b.stats.assists - a.stats.assists),
    active: [...roster].sort(
      (a, b) => b.tournamentsPlayed - a.tournamentsPlayed,
    ),
    points: ranked,
    monthly: [...roster].sort(comparePlayerOfMonth),
  };
}
