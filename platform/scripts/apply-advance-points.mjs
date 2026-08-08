/**
 * يمنح نقاط المتأهلين في بطولة dypd بأثر رجعي (مرة واحدة لكل لاعب/مباراة)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const text = readFileSync(resolve("D:/crow-tournament/.env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const POINT_REWARDS = {
  winMatch: { rank: 25, coins: 15, monthly: 10 },
  reachSemifinal: { rank: 15, coins: 10, monthly: 8 },
  reachFinal: { rank: 35, coins: 25, monthly: 15 },
  runnerUp: { rank: 60, coins: 40, monthly: 20 },
  champion: { rank: 120, coins: 80, monthly: 40 },
};

function rankFromPoints(points) {
  if (points >= 2500) return "أسطورة";
  if (points >= 2000) return "نخبة";
  if (points >= 1500) return "محترف";
  if (points >= 1200) return "صاعد";
  return "مبتدئ";
}

function calcWinRate(wins, losses) {
  const total = wins + losses;
  if (!total) return 0;
  return Math.round((wins / total) * 100);
}

function playerIdsForEntry(t, entryId) {
  if (!entryId) return [];
  const team = (t.teams || []).find((x) => x.id === entryId);
  if (team) {
    return [team.player1Id, team.player2Id, team.player3Id].filter(Boolean);
  }
  return [entryId];
}

function rewardPlayer(p, rankDelta, coinsDelta, monthlyDelta = 0) {
  const rankingPoints = Math.max(0, (p.stats?.rankingPoints ?? 0) + rankDelta);
  return {
    ...p,
    coins: Math.max(0, (p.coins ?? 0) + coinsDelta),
    monthlyScore: (p.monthlyScore ?? 0) + monthlyDelta,
    rank: p.role === "owner" ? "المالك" : p.role === "admin" ? "مشرف" : rankFromPoints(rankingPoints),
    stats: {
      ...p.stats,
      rankingPoints,
    },
  };
}

const env = loadEnv();
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const TOURNAMENT_ID = "t-1786042372176";

const { data: tRow, error: tErr } = await db
  .from("tournaments")
  .select("id, data")
  .eq("id", TOURNAMENT_ID)
  .single();
if (tErr) throw tErr;

const tournament = { id: tRow.id, ...tRow.data };
const bracket = tournament.bracket || [];
const totalRounds = Math.max(...bracket.map((m) => m.round), 1);
const decided = bracket.filter((m) => m.winnerId);
const rewardedKeys = new Set(tournament.rewardedMatchPlayerKeys || []);

const { data: profiles, error: pErr } = await db
  .from("profiles")
  .select("id, username, data");
if (pErr) throw pErr;

const playerMap = new Map(
  profiles.map((r) => [
    r.id,
    { id: r.id, username: r.username, ...(r.data || {}) },
  ]),
);

const touched = new Map();
const granted = [];
const skipped = [];

function getP(id) {
  return touched.get(id) || playerMap.get(id);
}

function setP(id, next) {
  touched.set(id, next);
}

for (const m of decided) {
  const hasOpponent = Boolean(m.player1Id && m.player2Id);
  if (!hasOpponent) continue;

  const winnerId = m.winnerId;
  const loserId = winnerId === m.player1Id ? m.player2Id : m.player1Id;
  const score1 = m.score1 ?? (winnerId === m.player1Id ? 5 : 0);
  const score2 = m.score2 ?? (winnerId === m.player2Id ? 5 : 0);
  const winnerGoals = winnerId === m.player1Id ? score1 : score2;
  const loserGoals = winnerId === m.player1Id ? score2 : score1;

  const winners = playerIdsForEntry(tournament, winnerId);
  const losers = playerIdsForEntry(tournament, loserId);

  for (const pid of winners) {
    const key = `${m.id}:win:${pid}`;
    const p = getP(pid);
    if (!p) {
      skipped.push({ key, reason: "missing-player" });
      continue;
    }

    const hasWinPoints =
      (p.wins ?? 0) >= 1 && (p.stats?.rankingPoints ?? 0) >= 25;

    // مفتاح موجود ونقاط موجودة = تم المنح فعلاً
    if (rewardedKeys.has(key) && hasWinPoints && !touched.has(pid)) {
      skipped.push({ key, username: p.username, reason: "already-keyed" });
      continue;
    }

    // نقاط موجودة بدون مفتاح (منح سابق) — سجّل المفتاح فقط
    if (!rewardedKeys.has(key) && hasWinPoints && !touched.has(pid)) {
      rewardedKeys.add(key);
      skipped.push({
        key,
        username: p.username,
        reason: "heuristic-already-has-win",
      });
      continue;
    }

    // مفتاح موجود لكن النقاط اتمسحت — أعد المنح
    if (rewardedKeys.has(key) && !hasWinPoints) {
      rewardedKeys.delete(key);
    }

    let next = rewardPlayer(
      p,
      POINT_REWARDS.winMatch.rank,
      POINT_REWARDS.winMatch.coins,
      POINT_REWARDS.winMatch.monthly,
    );
    const wins = (next.wins ?? 0) + 1;
    const losses = next.losses ?? 0;
    const matches = (next.matches ?? 0) + 1;
    next = {
      ...next,
      wins,
      matches,
      winRate: calcWinRate(wins, losses),
      stats: {
        ...next.stats,
        wins: (next.stats?.wins ?? 0) + 1,
        matches: (next.stats?.matches ?? 0) + 1,
        winStreak: (next.stats?.winStreak ?? 0) + 1,
        goals: (next.stats?.goals ?? 0) + Math.max(0, winnerGoals),
        winRate: calcWinRate((next.stats?.wins ?? 0) + 1, next.stats?.losses ?? 0),
      },
    };

    if (m.round === totalRounds) {
      next = rewardPlayer(
        next,
        POINT_REWARDS.champion.rank,
        POINT_REWARDS.champion.coins,
        POINT_REWARDS.champion.monthly,
      );
      next = {
        ...next,
        tournamentsWon: (next.tournamentsWon ?? 0) + 1,
        stats: { ...next.stats, bestPlacement: 1 },
      };
    } else if (m.round === totalRounds - 1) {
      next = rewardPlayer(
        next,
        POINT_REWARDS.reachFinal.rank,
        POINT_REWARDS.reachFinal.coins,
        POINT_REWARDS.reachFinal.monthly,
      );
    } else if (m.round === totalRounds - 2) {
      next = rewardPlayer(
        next,
        POINT_REWARDS.reachSemifinal.rank,
        POINT_REWARDS.reachSemifinal.coins,
        POINT_REWARDS.reachSemifinal.monthly,
      );
    }

    setP(pid, next);
    rewardedKeys.add(key);
    granted.push({
      username: p.username,
      role: "win",
      match: m.id,
      round: m.round,
      deltaRank: POINT_REWARDS.winMatch.rank,
    });
  }

  for (const pid of losers) {
    const key = `${m.id}:loss:${pid}`;
    const p = getP(pid);
    if (!p) {
      skipped.push({ key, reason: "missing-player" });
      continue;
    }

    const hasLoss = (p.losses ?? 0) >= 1;
    if (rewardedKeys.has(key) && hasLoss && !touched.has(pid)) {
      skipped.push({ key, username: p.username, reason: "already-keyed" });
      continue;
    }
    if (!rewardedKeys.has(key) && hasLoss && !touched.has(pid)) {
      rewardedKeys.add(key);
      skipped.push({
        key,
        username: p.username,
        reason: "heuristic-already-has-loss",
      });
      continue;
    }
    if (rewardedKeys.has(key) && !hasLoss) {
      rewardedKeys.delete(key);
    }

    const losses = (p.losses ?? 0) + 1;
    const matches = (p.matches ?? 0) + 1;
    let next = {
      ...p,
      losses,
      matches,
      winRate: calcWinRate(p.wins ?? 0, losses),
      stats: {
        ...p.stats,
        losses: (p.stats?.losses ?? 0) + 1,
        matches: (p.stats?.matches ?? 0) + 1,
        winStreak: 0,
        goals: (p.stats?.goals ?? 0) + Math.max(0, loserGoals),
        winRate: calcWinRate(p.stats?.wins ?? 0, (p.stats?.losses ?? 0) + 1),
      },
    };

    if (m.round === totalRounds) {
      next = rewardPlayer(
        next,
        POINT_REWARDS.runnerUp.rank,
        POINT_REWARDS.runnerUp.coins,
        POINT_REWARDS.runnerUp.monthly,
      );
      next = { ...next, stats: { ...next.stats, bestPlacement: 2 } };
    }

    setP(pid, next);
    rewardedKeys.add(key);
    granted.push({
      username: p.username,
      role: "loss",
      match: m.id,
      round: m.round,
      deltaRank: 0,
    });
  }
}

console.log("Granting to", touched.size, "players…");
for (const [id, p] of touched) {
  const { password: _pw, ...rest } = p;
  const { error } = await db
    .from("profiles")
    .update({
      data: { ...rest, password: "" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("FAIL", p.username, error.message);
  } else {
    console.log(
      "OK",
      p.username,
      `pts=${p.stats?.rankingPoints}`,
      `W${p.wins}/L${p.losses}`,
      `coins=${p.coins}`,
    );
  }
}

const nextTournament = {
  ...tournament,
  rewardedMatchPlayerKeys: [...rewardedKeys],
};
const { id, ...tData } = nextTournament;
const { error: saveTErr } = await db
  .from("tournaments")
  .update({
    data: tData,
    updated_at: new Date().toISOString(),
  })
  .eq("id", id);
if (saveTErr) throw saveTErr;

console.log("\n=== Summary ===");
console.log("granted:", granted.length);
console.log("skipped:", skipped.length);
console.log(
  "winners granted:",
  granted.filter((g) => g.role === "win").map((g) => g.username).join(", "),
);
