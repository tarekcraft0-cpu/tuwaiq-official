/**
 * سحب نقاط/ألقاب بطولة kkk التجريبية + إعادة حساب من البطولات الحقيقية فقط
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

const FAKE_TOURNAMENT_IDS = new Set([
  "t-1786055184139", // بطولة kkk — تجربة وهمية
  "t-1786033340284", // بطوله وهميه
]);

const POINT_REWARDS = {
  winMatch: { rank: 15, coins: 10 },
  perGoal: { rank: 5, coins: 2 },
  reachSemifinal: { rank: 20, coins: 12 },
  reachFinal: { rank: 40, coins: 25 },
  runnerUp: { rank: 60, coins: 40 },
  champion: { rank: 120, coins: 80 },
};

function pointsForMatchResult(won, goals) {
  const g = Math.max(0, Math.floor(Number(goals) || 0));
  const fromGoals = {
    rank: g * POINT_REWARDS.perGoal.rank,
    coins: g * POINT_REWARDS.perGoal.coins,
  };
  if (!won) {
    return { rank: fromGoals.rank, coins: fromGoals.coins, monthly: Math.min(8, g) };
  }
  return {
    rank: POINT_REWARDS.winMatch.rank + fromGoals.rank,
    coins: POINT_REWARDS.winMatch.coins + fromGoals.coins,
    monthly: 10 + g,
  };
}

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

function emptyAcc() {
  return {
    rank: 0,
    coinsBonus: 0,
    monthly: 0,
    wins: 0,
    losses: 0,
    matches: 0,
    goals: 0,
    tournamentsWon: 0,
    bestPlacement: 0,
    winStreak: 0,
  };
}

const env = loadEnv();
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: tRows, error: tErr } = await db.from("tournaments").select("id, data");
if (tErr) throw tErr;
const { data: profiles, error: pErr } = await db
  .from("profiles")
  .select("id, username, data");
if (pErr) throw pErr;

/** كل اللاعبين المشاركين في البطولات الوهمية — نضمن إعادة ضبطهم */
const fakeParticipantIds = new Set();
for (const row of tRows || []) {
  if (!FAKE_TOURNAMENT_IDS.has(row.id)) continue;
  const t = row.data || {};
  for (const team of t.teams || []) {
    for (const id of [team.player1Id, team.player2Id, team.player3Id]) {
      if (id) fakeParticipantIds.add(id);
    }
  }
  for (const id of t.participants || []) {
    // participants may be team ids
    const team = (t.teams || []).find((x) => x.id === id);
    if (team) {
      for (const pid of [team.player1Id, team.player2Id, team.player3Id]) {
        if (pid) fakeParticipantIds.add(pid);
      }
    } else {
      fakeParticipantIds.add(id);
    }
  }
}

const acc = new Map();
function bump(id, patch) {
  if (!id) return;
  const cur = acc.get(id) || emptyAcc();
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "number") {
      if (k === "bestPlacement") {
        const prev = cur.bestPlacement || 0;
        cur.bestPlacement =
          prev > 0 && v > 0 ? Math.min(prev, v) : prev || v;
      } else {
        cur[k] = (cur[k] || 0) + v;
      }
    }
  }
  acc.set(id, cur);
}

const tournamentKeyUpdates = [];

for (const row of tRows || []) {
  const t = { id: row.id, ...(row.data || {}) };
  if (t.deleted) continue;
  if (FAKE_TOURNAMENT_IDS.has(t.id)) {
    console.log("SKIP FAKE", t.id, t.name);
    continue;
  }
  const bracket = t.bracket || [];
  if (!bracket.length) continue;
  const totalRounds = Math.max(...bracket.map((m) => m.round), 1);
  const decided = bracket.filter((m) => m.winnerId);
  const keys = [];

  for (const m of decided) {
    if (!m.player1Id || !m.player2Id) continue;
    const winnerId = m.winnerId;
    const loserId = winnerId === m.player1Id ? m.player2Id : m.player1Id;
    const score1 = m.score1 ?? (winnerId === m.player1Id ? 5 : 0);
    const score2 = m.score2 ?? (winnerId === m.player2Id ? 5 : 0);
    const winnerGoals = winnerId === m.player1Id ? score1 : score2;
    const loserGoals = winnerId === m.player1Id ? score2 : score1;
    const winR = pointsForMatchResult(true, winnerGoals);
    const lossR = pointsForMatchResult(false, loserGoals);

    for (const pid of playerIdsForEntry(t, winnerId)) {
      keys.push(`${m.id}:win:${pid}`);
      const patch = {
        rank: winR.rank,
        coinsBonus: winR.coins,
        monthly: winR.monthly,
        wins: 1,
        matches: 1,
        goals: Math.max(0, winnerGoals),
      };
      if (m.round === totalRounds) {
        patch.rank += POINT_REWARDS.champion.rank;
        patch.coinsBonus += POINT_REWARDS.champion.coins;
        patch.monthly += 40;
        patch.tournamentsWon = 1;
        patch.bestPlacement = 1;
      } else if (m.round === totalRounds - 1) {
        patch.rank += POINT_REWARDS.reachFinal.rank;
        patch.coinsBonus += POINT_REWARDS.reachFinal.coins;
        patch.monthly += 15;
      } else if (m.round === totalRounds - 2) {
        patch.rank += POINT_REWARDS.reachSemifinal.rank;
        patch.coinsBonus += POINT_REWARDS.reachSemifinal.coins;
        patch.monthly += 8;
      }
      bump(pid, patch);
    }

    for (const pid of playerIdsForEntry(t, loserId)) {
      keys.push(`${m.id}:loss:${pid}`);
      const patch = {
        rank: lossR.rank,
        coinsBonus: lossR.coins,
        monthly: lossR.monthly,
        losses: 1,
        matches: 1,
        goals: Math.max(0, loserGoals),
      };
      if (m.round === totalRounds) {
        patch.rank += POINT_REWARDS.runnerUp.rank;
        patch.coinsBonus += POINT_REWARDS.runnerUp.coins;
        patch.monthly += 20;
        patch.bestPlacement = 2;
      }
      bump(pid, patch);
    }
  }

  if (keys.length) tournamentKeyUpdates.push({ id: t.id, data: t, keys });
}

for (const [, a] of acc) {
  a.winStreak = a.losses > 0 ? 0 : a.wins;
}

// لاعبو التجربة + كل من عنده سجل مباريات
const touchIds = new Set([...acc.keys(), ...fakeParticipantIds]);

let updated = 0;
for (const row of profiles || []) {
  if (!touchIds.has(row.id)) continue;
  const data = { ...(row.data || {}) };
  const fromMatches = acc.get(row.id);
  const before = data.stats?.rankingPoints ?? 0;

  if (fromMatches) {
    const wins = fromMatches.wins;
    const losses = fromMatches.losses;
    const matches = fromMatches.matches;
    const goals = fromMatches.goals;
    const pts = fromMatches.rank;
    data.wins = wins;
    data.losses = losses;
    data.matches = matches;
    data.winRate = calcWinRate(wins, losses);
    data.tournamentsWon = fromMatches.tournamentsWon;
    data.monthlyScore = fromMatches.monthly;
    data.monthlyAward =
      fromMatches.tournamentsWon > 0 ? "أفضل لاعب في الشهر مرشح" : undefined;
    data.coins = Math.max(50, 50 + fromMatches.coinsBonus);
    data.rank =
      data.role === "owner"
        ? "المالك"
        : data.role === "admin"
          ? "مشرف"
          : rankFromPoints(pts);
    data.stats = {
      ...(data.stats || {}),
      rankingPoints: pts,
      wins,
      losses,
      matches,
      goals,
      winRate: calcWinRate(wins, losses),
      winStreak: fromMatches.winStreak,
      bestPlacement: fromMatches.bestPlacement || 0,
    };
    console.log(
      "FIX",
      row.username,
      `${before}→${pts}`,
      `W${wins}/L${losses}`,
      `titles=${fromMatches.tournamentsWon}`,
    );
  } else {
    // مشارك في الوهمية فقط — صفّر سجل المباريات/الألقاب
    data.wins = 0;
    data.losses = 0;
    data.matches = 0;
    data.winRate = 0;
    data.tournamentsWon = 0;
    data.monthlyScore = 0;
    data.monthlyAward = undefined;
    data.coins = 50;
    if (data.role !== "owner" && data.role !== "admin") data.rank = "مبتدئ";
    data.stats = {
      ...(data.stats || {}),
      rankingPoints: 0,
      wins: 0,
      losses: 0,
      matches: 0,
      goals: 0,
      winRate: 0,
      winStreak: 0,
      bestPlacement: 0,
    };
    console.log("ZERO-FAKE-ONLY", row.username, `${before}→0`);
  }

  const { error } = await db
    .from("profiles")
    .update({
      data: { ...data, password: "", monthlyAward: data.monthlyAward ?? null },
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) console.error("FAIL", row.username, error.message);
  else updated++;
}

// حذف ناعم للبطولات الوهمية
for (const id of FAKE_TOURNAMENT_IDS) {
  const row = (tRows || []).find((r) => r.id === id);
  if (!row) continue;
  const data = {
    ...(row.data || {}),
    deleted: true,
    registrationOpen: false,
    status: "finished",
    pendingRegistrations: [],
    rewardedMatchPlayerKeys: [],
  };
  const { error } = await db
    .from("tournaments")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", id);
  console.log(error ? `DEL FAIL ${id}` : `DELETED ${id} (${row.data?.name})`);
}

for (const { id, data, keys } of tournamentKeyUpdates) {
  const { id: _tid, ...rest } = data;
  const { error } = await db
    .from("tournaments")
    .update({
      data: { ...rest, rewardedMatchPlayerKeys: keys },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) console.error("T FAIL", id, error.message);
}

console.log("\nUpdated players:", updated);
