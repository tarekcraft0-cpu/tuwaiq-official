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

function rankFromPoints(points) {
  if (points >= 2500) return "أسطورة";
  if (points >= 2000) return "نخبة";
  if (points >= 1500) return "محترف";
  if (points >= 1200) return "صاعد";
  return "مبتدئ";
}

const env = loadEnv();
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function loadByUsername(name) {
  const { data, error } = await db
    .from("profiles")
    .select("id, username, data")
    .eq("username", name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function save(row, data) {
  const { error } = await db
    .from("profiles")
    .update({
      data: { ...data, password: "" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) throw error;
}

// صفر __A و __4 (لقب بطولة ب التجريبية سابقاً)
for (const name of ["__A", "__4"]) {
  const row = await loadByUsername(name);
  if (!row) continue;
  const data = { ...(row.data || {}) };
  data.wins = 0;
  data.losses = 0;
  data.matches = 0;
  data.winRate = 0;
  data.tournamentsWon = 0;
  data.monthlyScore = 0;
  data.monthlyAward = null;
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
  await save(row, data);
  console.log("ZERO", row.username);
}

// أرجع +50 لـ levii (منحة يدوية سابقة)
const levii = await loadByUsername("levii");
if (levii) {
  const data = { ...(levii.data || {}) };
  const before = data.stats?.rankingPoints ?? 0;
  const after = before + 50;
  data.stats = { ...(data.stats || {}), rankingPoints: after };
  if (data.role !== "owner" && data.role !== "admin") {
    data.rank = rankFromPoints(after);
  }
  await save(levii, data);
  console.log("levii", before, "→", after);
}

// احذف بطولة ب كمان لو وهمية قديمة بأسماء __4/__A
const { data: t } = await db
  .from("tournaments")
  .select("id, data")
  .eq("id", "t-1786036021196")
  .maybeSingle();
if (t && !t.data?.deleted) {
  const data = {
    ...(t.data || {}),
    deleted: true,
    registrationOpen: false,
    pendingRegistrations: [],
  };
  await db
    .from("tournaments")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", t.id);
  console.log("DELETED بطولة ب");
}
