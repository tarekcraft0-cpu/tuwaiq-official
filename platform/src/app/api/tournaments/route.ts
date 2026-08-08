import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { isStaff } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { pickPreferredBracket } from "@/lib/bracket-stable";
import {
  deleteTournament,
  findTournamentByRef,
  saveTournament,
} from "@/lib/server-store";
import type { Tournament } from "@/lib/types";

/** حفظ/تحديث بطولة أو رابط تسجيل فوراً على السيرفر */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase غير مُعدّ بعد" },
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
    const tournament = body.tournament as Tournament | undefined;
    if (!tournament?.id || !tournament.name) {
      return NextResponse.json(
        { ok: false, error: "بيانات البطولة ناقصة" },
        { status: 400 },
      );
    }

    const existing = await findTournamentByRef(tournament.id);

    // حفظ صريح من المشرف (فيه bracketUpdatedAt) = المصدر المعتمد للشجرة
    // حتى الإرجاع واستبدال اليوزر ما يرجعون بالغلط من نسخة قديمة
    const clientWroteBracket = Boolean(
      tournament.bracketUpdatedAt && Array.isArray(tournament.bracket),
    );
    const bracket = clientWroteBracket
      ? tournament.bracket!
      : pickPreferredBracket(
          tournament.bracket,
          existing?.bracket,
          tournament.bracketUpdatedAt,
          existing?.bracketUpdatedAt,
        );
    const bracketUpdatedAt = clientWroteBracket
      ? tournament.bracketUpdatedAt!
      : tournament.bracketUpdatedAt ||
        existing?.bracketUpdatedAt ||
        new Date().toISOString();

    const next: Tournament = {
      ...(existing || {}),
      ...tournament,
      id: tournament.id,
      bracket,
      bracketUpdatedAt,
      status: tournament.status ?? existing?.status ?? "upcoming",
      participants: tournament.participants ?? existing?.participants ?? [],
      teams: tournament.teams ?? existing?.teams,
      pendingRegistrations:
        tournament.pendingRegistrations ??
        existing?.pendingRegistrations ??
        [],
    };
    await saveTournament(next);
    return NextResponse.json({ ok: true, tournament: next });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل حفظ البطولة" },
      { status: 500 },
    );
  }
}

/** حذف بطولة / رابط تسجيل من السيرفر نهائياً */
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase غير مُعدّ بعد" },
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
    const id = String(body.id || body.tournamentId || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "معرّف الحذف ناقص" },
        { status: 400 },
      );
    }

    const existing = await findTournamentByRef(id);
    if (!existing) {
      return NextResponse.json({ ok: true, alreadyGone: true });
    }

    await deleteTournament(existing.id);
    return NextResponse.json({ ok: true, id: existing.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل حذف البطولة من السيرفر" },
      { status: 500 },
    );
  }
}
