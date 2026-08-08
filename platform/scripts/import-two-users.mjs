/**
 * يستورد 0ZZ0 و Alphavill ويطبّق أفتاراتهم
 * node --env-file=.env.local scripts/import-two-users.mjs
 */
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const map = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/plato-avatar-map.json"), "utf8"),
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const names = process.argv.slice(2);
if (!names.length) {
  console.error("Usage: node --env-file=.env.local scripts/import-two-users.mjs User1 User2");
  process.exit(1);
}

function emptyPlayer(username, avatar) {
  return {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username,
    password: "",
    avatar: avatar || "/logo.png",
    role: "member",
    joinedAt: new Date().toISOString().slice(0, 10),
    rank: "مبتدئ",
    coins: 50,
    inventory: ["badge-founder"],
    equipped: {},
    tournamentsPlayed: 0,
    tournamentsWon: 0,
    winRate: 0,
    matches: 0,
    wins: 0,
    losses: 0,
    stats: {
      goals: 0,
      assists: 0,
      tournaments: 0,
      wins: 0,
      losses: 0,
      matches: 0,
      winRate: 0,
      winStreak: 0,
      bestPlacement: 0,
      rankingPoints: 0,
    },
    achievements: [],
    badges: ["عضو القروب"],
    recentTournaments: [],
    monthlyScore: 0,
    unclaimed: true,
  };
}

const { data: existing, error: readErr } = await db
  .from("profiles")
  .select("id, username, data");
if (readErr) {
  console.error(readErr);
  process.exit(1);
}

const byLower = new Map(
  (existing || []).map((r) => [String(r.username).toLowerCase(), r]),
);

for (const name of names) {
  const avatar = map[name.toLowerCase()]?.avatar;
  if (!avatar) {
    console.error("no avatar map for", name);
    continue;
  }
  const file = path.join(root, "public", avatar.replace(/^\//, ""));
  if (!fs.existsSync(file)) {
    console.error("missing file", file);
    continue;
  }

  const row = byLower.get(name.toLowerCase());
  if (!row) {
    const player = emptyPlayer(name, avatar);
    const password_hash = await bcrypt.hash(`!unclaimed!${player.id}`, 8);
    const { password: _pw, ...rest } = player;
    const { error } = await db.from("profiles").upsert({
      id: player.id,
      username: player.username,
      password_hash,
      data: { ...rest, password: "", unclaimed: true },
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("create failed", name, error);
    } else {
      console.log("created", name, avatar);
    }
  } else {
    const data = { ...(row.data || {}), avatar };
    const { error } = await db
      .from("profiles")
      .update({ data, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      console.error("update failed", name, error);
    } else {
      console.log("updated avatar", name, avatar, "(was", row.data?.avatar, ")");
    }
  }
}

console.log("done");
