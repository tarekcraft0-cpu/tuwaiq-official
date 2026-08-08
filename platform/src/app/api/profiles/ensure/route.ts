import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { isStaff } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { ensureUnclaimedProfile } from "@/lib/server-store";

/** إنشاء/جلب حسابات باليوزر (مشرف) — للتعبئة من الشجرة */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "السيرفر غير مُعدّ بعد" },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json(
      { ok: false, error: "صلاحية المشرف مطلوبة" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const raw = Array.isArray(body.usernames)
      ? body.usernames
      : [body.username].filter(Boolean);
    const names = raw
      .map((x: unknown) => String(x || "").trim().replace(/^@/, ""))
      .filter((x: string) => x.length >= 2);

    if (!names.length) {
      return NextResponse.json(
        { ok: false, error: "اكتب يوزر واحد على الأقل" },
        { status: 400 },
      );
    }

    const profiles: {
      id: string;
      username: string;
      avatar: string;
      created: boolean;
    }[] = [];

    for (const name of names) {
      const res = await ensureUnclaimedProfile(name);
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: res.error },
          { status: 400 },
        );
      }
      const avatar =
        (res.profile.data as { avatar?: string } | null)?.avatar ||
        "/logo.png";
      profiles.push({
        id: res.profile.id,
        username: res.profile.username,
        avatar,
        created: res.created,
      });
    }

    return NextResponse.json({ ok: true, profiles });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل تجهيز الحساب" },
      { status: 500 },
    );
  }
}
