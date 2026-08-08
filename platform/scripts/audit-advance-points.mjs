/**
 * يفحص بطولة كورة تيم الجارية ويحسب نقاط المتأهلين الناقصة
 */
const BASE = process.env.BASE_URL || "https://crow-tournament.vercel.app";

const POINT_REWARDS = {
  winMatch: { rank: 25, coins: 15, monthly: 10 },
  reachSemifinal: { rank: 15, coins: 10, monthly: 8 },
  reachFinal: { rank: 35, coins: 25, monthly: 15 },
  runnerUp: { rank: 60, coins: 40, monthly: 20 },
  champion: { rank: 120, coins: 80, monthly: 40 },
};

function playerIdsForEntry(t, entryId) {
  if (!entryId) return [];
  const team = (t.teams || []).find((x) => x.id === entryId);
  if (team) {
    return [team.player1Id, team.player2Id, team.player3Id].filter(Boolean);
  }
  return [entryId];
}

function teamLabel(t, players, entryId) {
  const team = (t.teams || []).find((x) => x.id === entryId);
  if (!team) return entryId;
  const names = [team.player1Id, team.player2Id, team.player3Id]
    .filter(Boolean)
    .map((id) => players.get(id)?.username || id.slice(0, 6))
    .join(" + ");
  return `${team.name || "فريق"} (${names})`;
}

const res = await fetch(`${BASE}/api/store`, { cache: "no-store" });
const json = await res.json();
if (!json.ok) throw new Error(JSON.stringify(json));

const players = new Map(
  (json.data.players || []).map((p) => [p.id, p]),
);
const t = (json.data.tournaments || []).find(
  (x) => x.id === "t-1786042372176" || x.shareCode === "dypd",
);
if (!t) throw new Error("tournament not found");

const bracket = t.bracket || [];
const totalRounds = Math.max(...bracket.map((m) => m.round), 1);
const decided = bracket.filter((m) => m.winnerId);

console.log("Tournament:", t.name, t.status, "format", t.format);
console.log("Rounds:", totalRounds, "decided:", decided.length);

/** @type {Map<string, { rank: number, coins: number, monthly: number, wins: number, losses: number, matches: number, goals: number, champion?: boolean, runnerUp?: boolean, reachFinal?: number, reachSemi?: number }>} */
const rewards = new Map();

function bump(id, patch) {
  const cur = rewards.get(id) || {
    rank: 0,
    coins: 0,
    monthly: 0,
    wins: 0,
    losses: 0,
    matches: 0,
    goals: 0,
    reachFinal: 0,
    reachSemi: 0,
  };
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "number") cur[k] = (cur[k] || 0) + v;
    else if (v) cur[k] = v;
  }
  rewards.set(id, cur);
}

console.log("\n=== Decided matches ===");
for (const m of decided.sort((a, b) => a.round - b.round || a.position - b.position)) {
  const winnerId = m.winnerId;
  const loserId =
    winnerId === m.player1Id ? m.player2Id : m.player1Id;
  const hasOpponent = Boolean(m.player1Id && m.player2Id);
  const score1 = m.score1 ?? (winnerId === m.player1Id ? 5 : 0);
  const score2 = m.score2 ?? (winnerId === m.player2Id ? 5 : 0);
  const winnerGoals = winnerId === m.player1Id ? score1 : score2;
  const loserGoals = winnerId === m.player1Id ? score2 : score1;

  console.log(
    `R${m.round} P${m.position}: ${teamLabel(t, players, winnerId)}  beat  ${
      hasOpponent ? teamLabel(t, players, loserId) : "(bye)"
    }  ${score1}-${score2}`,
  );

  if (!hasOpponent) continue; // bye = no points (same as app)

  const winners = playerIdsForEntry(t, winnerId);
  const losers = playerIdsForEntry(t, loserId);

  for (const id of winners) {
    bump(id, {
      rank: POINT_REWARDS.winMatch.rank,
      coins: POINT_REWARDS.winMatch.coins,
      monthly: POINT_REWARDS.winMatch.monthly,
      wins: 1,
      matches: 1,
      goals: Math.max(0, winnerGoals),
    });
    if (m.round === totalRounds) {
      bump(id, {
        rank: POINT_REWARDS.champion.rank,
        coins: POINT_REWARDS.champion.coins,
        monthly: POINT_REWARDS.champion.monthly,
        champion: true,
      });
    } else if (m.round === totalRounds - 1) {
      bump(id, {
        rank: POINT_REWARDS.reachFinal.rank,
        coins: POINT_REWARDS.reachFinal.coins,
        monthly: POINT_REWARDS.reachFinal.monthly,
        reachFinal: 1,
      });
    } else if (m.round === totalRounds - 2) {
      bump(id, {
        rank: POINT_REWARDS.reachSemifinal.rank,
        coins: POINT_REWARDS.reachSemifinal.coins,
        monthly: POINT_REWARDS.reachSemifinal.monthly,
        reachSemi: 1,
      });
    }
  }

  for (const id of losers) {
    bump(id, {
      losses: 1,
      matches: 1,
      goals: Math.max(0, loserGoals),
    });
    if (m.round === totalRounds) {
      bump(id, {
        rank: POINT_REWARDS.runnerUp.rank,
        coins: POINT_REWARDS.runnerUp.coins,
        monthly: POINT_REWARDS.runnerUp.monthly,
        runnerUp: true,
      });
    }
  }
}

console.log("\n=== Expected rewards (if none were granted) ===");
const rows = [...rewards.entries()]
  .map(([id, r]) => ({
    id,
    username: players.get(id)?.username || "?",
    currentPts: players.get(id)?.stats?.rankingPoints ?? 0,
    currentWins: players.get(id)?.wins ?? 0,
    ...r,
  }))
  .sort((a, b) => b.rank - a.rank);

for (const r of rows) {
  console.log(
    `${r.username.padEnd(20)} +${r.rank}pts +${r.coins}coins  W${r.wins}/L${r.losses}  (now ${r.currentPts}pts ${r.currentWins}W)`,
  );
}

// write JSON for apply script
import { writeFileSync } from "node:fs";
writeFileSync(
  new URL("./advance-points-pending.json", import.meta.url),
  JSON.stringify(
    {
      tournamentId: t.id,
      tournamentName: t.name,
      totalRounds,
      decidedCount: decided.length,
      rewards: Object.fromEntries(rewards),
      usernames: Object.fromEntries(
        [...rewards.keys()].map((id) => [id, players.get(id)?.username || id]),
      ),
    },
    null,
    2,
  ),
);
console.log("\nWrote scripts/advance-points-pending.json");
