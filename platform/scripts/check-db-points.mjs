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

const names = ["FRR", "cn_", "l11irre", "k33i", "j7t_", "zin_", "TH9"];
const { data: profiles } = await db
  .from("profiles")
  .select("id, username, data, updated_at")
  .in("username", names);

for (const r of profiles || []) {
  const d = r.data || {};
  console.log(
    r.username,
    "pts",
    d.stats?.rankingPoints,
    "W/L",
    d.wins,
    d.losses,
    "updated",
    r.updated_at,
  );
}

const { data: t } = await db
  .from("tournaments")
  .select("id, data, updated_at")
  .eq("id", "t-1786042372176")
  .single();
console.log(
  "\ntournament keys",
  (t.data?.rewardedMatchPlayerKeys || []).length,
  "updated",
  t.updated_at,
);
console.log("decided", (t.data?.bracket || []).filter((m) => m.winnerId).length);
