import { createEmptyPlayer } from "@/lib/data";
import { hashPassword } from "@/lib/auth-server";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { createProfile, findProfileByUsername } from "@/lib/server-store";

/** حساب المالك الافتراضي — يتحكم بالموقع والبطولات والآراء */
export const OWNER_USERNAME =
  process.env.TUWAIQ_OWNER_USER || "TuwaiqAdmin";
export const OWNER_PASSWORD =
  process.env.TUWAIQ_OWNER_PASS || "Tuwaiq@Admin26";

export async function ensureOwnerAccount() {
  if (!isSupabaseConfigured()) {
    return { ok: true as const, mode: "local" as const, username: OWNER_USERNAME };
  }

  const db = getSupabaseAdmin();
  const existing = await findProfileByUsername(OWNER_USERNAME);
  const password_hash = await hashPassword(OWNER_PASSWORD);

  if (existing) {
    const prev = (existing.data || {}) as Record<string, unknown>;
    const data = {
      ...prev,
      id: existing.id,
      username: OWNER_USERNAME,
      role: "owner",
      rank: "المالك",
      badges: Array.from(
        new Set([
          ...((Array.isArray(prev.badges) ? prev.badges : []) as string[]),
          "المالك",
        ]),
      ),
      password: "",
      unclaimed: false,
    };
    const { error } = await db
      .from("profiles")
      .update({
        password_hash,
        data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
    return { ok: true as const, mode: "supabase" as const, username: OWNER_USERNAME, updated: true };
  }

  const player = createEmptyPlayer(OWNER_USERNAME, OWNER_PASSWORD, "/logo.png");
  player.role = "owner";
  player.rank = "المالك";
  player.badges = ["المالك", "الجيل الأول"];
  await createProfile(player, OWNER_PASSWORD);
  return { ok: true as const, mode: "supabase" as const, username: OWNER_USERNAME, created: true };
}
