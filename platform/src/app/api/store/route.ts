import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { ensureOwnerAccount } from "@/lib/ensure-owner";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { getStoreSnapshot, saveStoreSnapshot } from "@/lib/server-store";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase غير مُعدّ بعد", storage: "local" },
      { status: 503 },
    );
  }
  try {
    await ensureOwnerAccount();
    const data = await getStoreSnapshot();
    return NextResponse.json({ ok: true, storage: "supabase", data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل جلب البيانات من السيرفر" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase غير مُعدّ بعد" },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "يجب تسجيل الدخول لحفظ التغييرات" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    await saveStoreSnapshot({
      players: body.players,
      tournaments: body.tournaments,
      votes: body.votes,
      news: body.news,
      notifications: body.notifications,
      hallOfFame: body.hallOfFame,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل حفظ البيانات" },
      { status: 500 },
    );
  }
}
