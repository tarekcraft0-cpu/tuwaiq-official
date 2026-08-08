import { NextResponse } from "next/server";
import { ensureOwnerAccount, OWNER_USERNAME } from "@/lib/ensure-owner";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET() {
  let owner: string | null = null;
  try {
    const ensured = await ensureOwnerAccount();
    owner = ensured.username;
  } catch (error) {
    console.error("ensureOwnerAccount", error);
  }

  return NextResponse.json({
    ok: true,
    storage: isSupabaseConfigured() ? "supabase" : "local",
    ownerReady: Boolean(owner),
    ownerUsername: OWNER_USERNAME,
  });
}
