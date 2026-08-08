const BASE = "https://crow-tournament.vercel.app";
const res = await fetch(`${BASE}/api/store`, { cache: "no-store" });
const json = await res.json();
const players = new Map((json.data.players || []).map((p) => [p.id, p]));
const t = (json.data.tournaments || []).find((x) => x.id === "t-1786042372176");
const decided = (t.bracket || []).filter((m) => m.winnerId && m.player1Id && m.player2Id);

function ids(entryId) {
  const team = (t.teams || []).find((x) => x.id === entryId);
  return team
    ? [team.player1Id, team.player2Id, team.player3Id].filter(Boolean)
    : [entryId];
}

console.log("rewarded keys:", (t.rewardedMatchPlayerKeys || []).length);

const missingWins = [];
const missingLoss = [];
for (const m of decided) {
  const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
  for (const pid of ids(m.winnerId)) {
    const p = players.get(pid);
    const key = `${m.id}:win:${pid}`;
    const keyed = (t.rewardedMatchPlayerKeys || []).includes(key);
    if ((p?.wins ?? 0) < 1 || (p?.stats?.rankingPoints ?? 0) < 25) {
      missingWins.push({
        user: p?.username || pid,
        wins: p?.wins,
        pts: p?.stats?.rankingPoints,
        keyed,
        match: m.id,
      });
    }
  }
  for (const pid of ids(loserId)) {
    const p = players.get(pid);
    const key = `${m.id}:loss:${pid}`;
    const keyed = (t.rewardedMatchPlayerKeys || []).includes(key);
    if ((p?.losses ?? 0) < 1) {
      missingLoss.push({
        user: p?.username || pid,
        losses: p?.losses,
        keyed,
        match: m.id,
      });
    }
  }
}

console.log("\nWinners still missing points:", missingWins.length);
for (const x of missingWins) console.log(x);
console.log("\nLosers still missing loss:", missingLoss.length);
for (const x of missingLoss) console.log(x);

console.log("\n=== Current R1 winners ===");
for (const m of decided.filter((x) => x.round === 1)) {
  const names = ids(m.winnerId)
    .map((id) => {
      const p = players.get(id);
      return `${p?.username}(${p?.stats?.rankingPoints}pts,${p?.wins}W)`;
    })
    .join(", ");
  console.log(names);
}
