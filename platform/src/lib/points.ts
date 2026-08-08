import type { Player } from "@/lib/types";

/**
 * نقاط الترتيب والعملات:
 * - فوز بالمباراة = أساس ثابت
 * - كل هدف تسجله يزيد نقاطك (فوز أو خسارة)
 */
export const POINT_REWARDS = {
  joinTournament: { rank: 5, coins: 10 },
  /** أساس الفوز بالمباراة */
  winMatch: { rank: 15, coins: 10 },
  /** نقطة عن كل هدف */
  perGoal: { rank: 5, coins: 2 },
  reachSemifinal: { rank: 20, coins: 12 },
  reachFinal: { rank: 40, coins: 25 },
  runnerUp: { rank: 60, coins: 40 },
  champion: { rank: 120, coins: 80 },
} as const;

/** نقاط الأهداف المسجّلة في مباراة */
export function pointsForGoals(goals: number) {
  const g = Math.max(0, Math.floor(Number(goals) || 0));
  return {
    rank: g * POINT_REWARDS.perGoal.rank,
    coins: g * POINT_REWARDS.perGoal.coins,
  };
}

/** مجموع نقاط نتيجة مباراة: فوز (اختياري) + أهداف */
export function pointsForMatchResult(won: boolean, goals: number) {
  const fromGoals = pointsForGoals(goals);
  if (!won) {
    return {
      rank: fromGoals.rank,
      coins: fromGoals.coins,
      monthly: Math.min(8, Math.max(0, Math.floor(goals))),
    };
  }
  return {
    rank: POINT_REWARDS.winMatch.rank + fromGoals.rank,
    coins: POINT_REWARDS.winMatch.coins + fromGoals.coins,
    monthly: 10 + Math.max(0, Math.floor(goals)),
  };
}

export function rankFromPoints(points: number) {
  if (points >= 2500) return "أسطورة";
  if (points >= 2000) return "نخبة";
  if (points >= 1500) return "محترف";
  if (points >= 1200) return "صاعد";
  return "مبتدئ";
}

export function calcWinRate(wins: number, losses: number) {
  const total = wins + losses;
  if (!total) return 0;
  return Math.round((wins / total) * 100);
}

/**
 * تقييم أفضل لاعب هذا الشهر:
 * نقاط الترتيب + الألقاب/الإنجازات + الفوز
 */
export function calcPlayerOfMonthScore(player: Player) {
  const points = player.stats?.rankingPoints ?? 0;
  const titles =
    (player.tournamentsWon ?? 0) * 100 + (player.achievements?.length ?? 0) * 30;
  const wins = (player.wins ?? 0) * 20;
  return points + titles + wins;
}

export function comparePlayerOfMonth(a: Player, b: Player) {
  const byScore = calcPlayerOfMonthScore(b) - calcPlayerOfMonthScore(a);
  if (byScore !== 0) return byScore;
  if (b.tournamentsWon !== a.tournamentsWon) {
    return b.tournamentsWon - a.tournamentsWon;
  }
  if (b.wins !== a.wins) return b.wins - a.wins;
  return (b.stats?.rankingPoints ?? 0) - (a.stats?.rankingPoints ?? 0);
}
