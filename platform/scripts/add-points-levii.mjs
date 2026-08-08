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

const { data: row, error } = await db
  .from("profiles")
  .select("id, username, data")
  .ilike("username", "levii")
  .maybeSingle();
if (error) throw error;
if (!row) throw new Error("player levii not found");

const data = { ...(row.data || {}) };
const before = data.stats?.rankingPoints ?? 0;
const after = before + 50;
data.stats = {
  ...(data.stats || {}),
  rankingPoints: after,
};
if (data.role !== "owner" && data.role !== "admin") {
  data.rank = rankFromPoints(after);
}

const { error: upErr } = await db
  .from("profiles")
  .update({
    data: { ...data, password: "" },
    updated_at: new Date().toISOString(),
  })
  .eq("id", row.id);
if (upErr) throw upErr;

console.log(`${row.username}: ${before} → ${after} (+50)`);
