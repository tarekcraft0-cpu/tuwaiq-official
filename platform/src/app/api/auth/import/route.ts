import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { PLATO_GROUP_USERNAMES } from "@/data/plato-group-usernames";
import { isStaff } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  applyPlatoAvatars,
  importUnclaimedProfiles,
} from "@/lib/server-store";

/** استيراد يوزرات قروب Plato كحسابات جاهزة (مشرفين فقط) */
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
    const body = await request.json().catch(() => ({}));

    if (body.applyAvatars) {
      const result = await applyPlatoAvatars({
        overwriteCustom: Boolean(body.overwriteCustom),
      });
      return NextResponse.json({
        ok: true,
        applied: result.updated,
        skipped: result.skipped,
        total: result.total,
      });
    }

    const source =
      body.useBuiltin || body.source === "builtin"
        ? PLATO_GROUP_USERNAMES
        : (body.usernames ?? body.text ?? "");
    const result = await importUnclaimedProfiles(source);
    return NextResponse.json({
      ok: true,
      created: result.created.length,
      skipped: result.skipped.length,
      total: result.total,
      createdUsernames: result.created,
      skippedUsernames: result.skipped,
      builtinCount: PLATO_GROUP_USERNAMES.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل استيراد اليوزرات" },
      { status: 500 },
    );
  }
}
