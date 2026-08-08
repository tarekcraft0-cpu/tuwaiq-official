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

const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: t } = await db
  .from("tournaments")
  .select("data")
  .eq("id", "t-1786042372176")
  .single();

const match = (t.data.bracket || []).find((m) => m.id.includes("m-r1-p9"));
console.log("match", match);
const team = (t.data.teams || []).find((x) => x.id === match?.winnerId);
console.log("winner team", team);

for (const id of [team?.player1Id, team?.player2Id]) {
  const { data } = await db
    .from("profiles")
    .select("id, username, password_hash, data")
    .eq("id", id)
    .maybeSingle();
  console.log("by id", id, data?.username, "hash?", Boolean(data?.password_hash), "pts", data?.data?.stats?.rankingPoints);
}

const { data: byName } = await db
  .from("profiles")
  .select("id, username, data")
  .ilike("username", "frr");
console.log("by name", byName?.map((r) => ({ id: r.id, u: r.username, pts: r.data?.stats?.rankingPoints })));
