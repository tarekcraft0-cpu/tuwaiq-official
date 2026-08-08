import { NextResponse } from "next/server";
import { getSession, withClearedSessionCookie, withSessionCookie } from "@/lib/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { findProfileById } from "@/lib/server-store";
import { normalizePlayer } from "@/lib/data";
import type { Player } from "@/lib/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, storage: "local", user: null });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: true, storage: "supabase", user: null });
  }

  try {
    const row = await findProfileById(session.id);
    if (!row) {
      return withClearedSessionCookie(
        NextResponse.json({ ok: true, storage: "supabase", user: null }),
      );
    }

    const player = normalizePlayer({
      ...(row.data as Partial<Player>),
      id: row.id,
      username: row.username,
      password: "",
    });

    const user = {
      id: player.id,
      username: player.username,
      avatar: player.avatar,
      role: player.role,
    };

    // حدّث الكوكي بالرتبة الحالية (مشرف / مالك)
    return withSessionCookie(
      NextResponse.json({ ok: true, storage: "supabase", user, player }),
      user,
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: true, storage: "supabase", user: session });
  }
}
