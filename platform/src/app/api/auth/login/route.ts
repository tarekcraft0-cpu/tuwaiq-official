import { NextResponse } from "next/server";
import {
  publicPlayer,
  verifyPassword,
  withSessionCookie,
} from "@/lib/auth-server";
import { isStaff } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { findProfileByUsername } from "@/lib/server-store";
import { normalizePlayer } from "@/lib/data";
import type { Player } from "@/lib/types";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "السيرفر غير مُعدّ بعد" },
      { status: 503 },
    );
  }

  try {
    const { username, password, portal } = await request.json();
    const name = String(username || "").trim();
    const pass = String(password || "");
    if (!name || !pass) {
      return NextResponse.json(
        { ok: false, error: "أدخل اليوزر وكلمة المرور" },
        { status: 400 },
      );
    }

    const row = await findProfileByUsername(name);
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "اليوزر غير موجود" },
        { status: 404 },
      );
    }

    const valid = await verifyPassword(pass, row.password_hash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "كلمة المرور غير صحيحة" },
        { status: 401 },
      );
    }

    const player = publicPlayer(
      normalizePlayer({
        ...(row.data as Partial<Player>),
        id: row.id,
        username: row.username,
        password: "",
      }),
    );

    if (portal === "admin" && !isStaff(player.role)) {
      return NextResponse.json(
        { ok: false, error: "هذا الحساب ليس مشرفاً" },
        { status: 403 },
      );
    }

    const sessionUser = {
      id: player.id,
      username: player.username,
      avatar: player.avatar,
      role: player.role,
    };

    return withSessionCookie(
      NextResponse.json({ ok: true, user: sessionUser, player }),
      sessionUser,
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل تسجيل الدخول" },
      { status: 500 },
    );
  }
}
