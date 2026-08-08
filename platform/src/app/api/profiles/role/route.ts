import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { isOwner } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { setProfileRole } from "@/lib/server-store";

/** منح/سحب مشرف — المالك فقط */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase غير مُعدّ بعد" },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session || !isOwner(session.role)) {
    return NextResponse.json(
      { ok: false, error: "صلاحية المالك مطلوبة" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const profileId = String(body.profileId || body.userId || "").trim();
    const role = String(body.role || "").trim();
    if (!profileId) {
      return NextResponse.json(
        { ok: false, error: "معرف الحساب ناقص" },
        { status: 400 },
      );
    }
    if (role !== "admin" && role !== "member") {
      return NextResponse.json(
        { ok: false, error: "الرتبة غير صالحة" },
        { status: 400 },
      );
    }
    if (profileId === session.id) {
      return NextResponse.json(
        { ok: false, error: "ما تقدر تعدّل صلاحيتك بنفسك" },
        { status: 400 },
      );
    }

    const result = await setProfileRole(profileId, role);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      player: {
        id: result.player.id,
        username: result.player.username,
        role: result.player.role,
        rank: result.player.rank,
        badges: result.player.badges,
        avatar: result.player.avatar,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل تحديث الصلاحية" },
      { status: 500 },
    );
  }
}
