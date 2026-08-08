import bcrypt from "bcryptjs";
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

const PASSWORD = "Levii@Crow26";

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

const password_hash = await bcrypt.hash(PASSWORD, 8);
const data = { ...(row.data || {}) };
const badges = Array.isArray(data.badges)
  ? data.badges.filter((b) => b !== "مشرف" && b !== "المالك")
  : [];
badges.push("مشرف");

const next = {
  ...data,
  role: "admin",
  rank: "مشرف",
  badges,
  unclaimed: false,
  password: "",
};

const { error: upErr } = await db
  .from("profiles")
  .update({
    password_hash,
    data: next,
    updated_at: new Date().toISOString(),
  })
  .eq("id", row.id);
if (upErr) throw upErr;

console.log(
  JSON.stringify(
    {
      ok: true,
      username: row.username,
      password: PASSWORD,
      role: "admin",
      rank: "مشرف",
    },
    null,
    2,
  ),
);
