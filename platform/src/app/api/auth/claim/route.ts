import { NextResponse } from "next/server";
import {
  publicPlayer,
  withSessionCookie,
} from "@/lib/auth-server";
import { normalizePlayer } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  claimUnclaimedProfile,
  findProfileByUsername,
} from "@/lib/server-store";
import type { Player } from "@/lib/types";

/** معرفة حالة اليوزر: غير موجود / جاهز للتفعيل / مفعّل */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "السيرفر غير مُعدّ بعد" },
      { status: 503 },
    );
  }

  try {
    const username = new URL(request.url).searchParams.get("username") || "";
    const name = username.trim();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { ok: false, error: "أدخل يوزر Plato" },
        { status: 400 },
      );
    }

    const row = await findProfileByUsername(name);
    if (!row) {
      return NextResponse.json({
        ok: true,
        exists: false,
        unclaimed: false,
        username: name,
      });
    }

    const data = (row.data || {}) as Partial<Player>;
    return NextResponse.json({
      ok: true,
      exists: true,
      unclaimed: Boolean(data.unclaimed),
      username: row.username,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل البحث عن اليوزر" },
      { status: 500 },
    );
  }
}

/** تفعيل حساب مستورد: يوزر Plato + كلمة مرور → دخول مباشر */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "السيرفر غير مُعدّ بعد" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || username.length < 2) {
      return NextResponse.json(
        { ok: false, error: "أدخل يوزر Plato" },
        { status: 400 },
      );
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { ok: false, error: "كلمة المرور قصيرة (4 أحرف على الأقل)" },
        { status: 400 },
      );
    }

    const result = await claimUnclaimedProfile(username, password);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, claimed: result.claimed },
        { status: result.claimed ? 409 : 404 },
      );
    }

    const player = result.player;
    const sessionUser = {
      id: player.id,
      username: player.username,
      avatar: player.avatar,
      role: player.role,
    };

    return withSessionCookie(
      NextResponse.json({
        ok: true,
        user: sessionUser,
        player: publicPlayer(
          normalizePlayer({
            ...player,
            password: "",
          }),
        ),
      }),
      sessionUser,
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل تفعيل الحساب" },
      { status: 500 },
    );
  }
}
