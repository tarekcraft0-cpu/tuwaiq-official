import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

// Use compiled merge via duplicating minimal logic + direct supabase upsert like server
import {
  mergePlayersPreferProgress,
  normalizePlayer,
  playerProgressScore,
} from "../src/lib/data.ts";

function loadEnv() {
  const text = readFileSync(resolve("D:/crow-tournament/.env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const log = [];
function say(...args) {
  const line = args.map(String).join(" ");
  log.push(line);
  console.log(line);
}

const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const id = "p-1785957970514-109-qd9ve8";
const { data: row } = await db
  .from("profiles")
  .select("id, username, data")
  .eq("id", id)
  .single();

const current = normalizePlayer({
  id: row.id,
  username: row.username,
  ...(row.data || {}),
});
say("before", current.stats.rankingPoints, current.wins);

const withPoints = normalizePlayer({
  ...current,
  wins: 1,
  matches: 1,
  coins: 65,
  stats: {
    ...current.stats,
    rankingPoints: 25,
    wins: 1,
    matches: 1,
    winRate: 100,
    winStreak: 1,
  },
});

await db
  .from("profiles")
  .update({
    data: { ...withPoints, password: "" },
    updated_at: new Date().toISOString(),
  })
  .eq("id", id);

const { data: mid } = await db.from("profiles").select("data").eq("id", id).single();
say("after force", mid.data?.stats?.rankingPoints, mid.data?.wins);

const stale = normalizePlayer({
  ...current,
  wins: 0,
  matches: 0,
  losses: 0,
  coins: 50,
  stats: {
    ...current.stats,
    rankingPoints: 0,
    wins: 0,
    matches: 0,
    losses: 0,
    winRate: 0,
    winStreak: 0,
  },
});

const prevPlayer = normalizePlayer({
  id,
  username: mid.data?.username || row.username,
  ...mid.data,
});
say("scores", playerProgressScore(prevPlayer), playerProgressScore(stale));
const merged = mergePlayersPreferProgress(prevPlayer, stale);
say("merged would be", merged.stats.rankingPoints, merged.wins);

// Now call real upsertPlayers via dynamic import of ts
const { upsertPlayers } = await import("../src/lib/server-store.ts");
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
await upsertPlayers([stale]);

const { data: after } = await db.from("profiles").select("data").eq("id", id).single();
say("after stale upsertPlayers", after.data?.stats?.rankingPoints, after.data?.wins);

writeFileSync("scripts/test-merge-wipe.log", log.join("\n"));
