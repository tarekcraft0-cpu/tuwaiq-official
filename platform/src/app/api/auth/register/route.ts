import { NextResponse } from "next/server";
import { publicPlayer, withSessionCookie } from "@/lib/auth-server";
import { createEmptyPlayer } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { createProfile, findProfileByUsername } from "@/lib/server-store";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "السيرفر غير مُعدّ بعد" },
      { status: 503 },
    );
  }

  try {
    const { username, password, avatar } = await request.json();
    const name = String(username || "").trim();
    const pass = String(password || "");
    if (!name || !pass) {
      return NextResponse.json(
        { ok: false, error: "أدخل اليوزر وكلمة المرور" },
        { status: 400 },
      );
    }
    if (name.length < 2) {
      return NextResponse.json(
        { ok: false, error: "اليوزر قصير جداً" },
        { status: 400 },
      );
    }

    const exists = await findProfileByUsername(name);
    if (exists) {
      const unclaimed = Boolean(
        (exists.data as { unclaimed?: boolean } | null)?.unclaimed,
      );
      return NextResponse.json(
        {
          ok: false,
          unclaimed,
          error: unclaimed
            ? "يوزرك جاهز من قائمة القروب — عيّن كلمة مرور للدخول لحسابك"
            : "اليوزر مستخدم مسبقاً — سجّل الدخول",
        },
        { status: 409 },
      );
    }

    const player = createEmptyPlayer(name, "", avatar || "/logo.png");
    await createProfile(player, pass);

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
        player: publicPlayer(player),
      }),
      sessionUser,
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل إنشاء الحساب" },
      { status: 500 },
    );
  }
}
