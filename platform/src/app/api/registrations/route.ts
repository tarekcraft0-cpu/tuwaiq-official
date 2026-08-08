import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { isRegistrationOpen } from "@/lib/registration";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  appendPendingRegistration,
  ensureUnclaimedProfile,
  findTournamentByRef,
  removePendingRegistration,
  replacePendingRegistrations,
  updatePendingRegistration,
} from "@/lib/server-store";
import { isStaff } from "@/lib/roles";
import { getTournamentFormat } from "@/lib/tournament-format";

function memberNames(input: {
  username: string;
  teammateUsername?: string;
  teammate2Username?: string;
}) {
  return [input.username, input.teammateUsername, input.teammate2Username]
    .map((x) => (x || "").trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase غير مُعدّ بعد" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const tournamentId = String(body.tournamentId || "").trim();
    const username = String(body.username || "").trim();
    const teammateUsername = String(body.teammateUsername || "").trim();
    const teammate2Username = String(body.teammate2Username || "").trim();
    if (!tournamentId) {
      return NextResponse.json(
        { ok: false, error: "معرّف التسجيل ناقص" },
        { status: 400 },
      );
    }
    if (!username || username.length < 2) {
      return NextResponse.json(
        { ok: false, error: "اختر يوزر Plato صحيح" },
        { status: 400 },
      );
    }

    const tournament = await findTournamentByRef(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { ok: false, error: "رابط التسجيل غير موجود" },
        { status: 404 },
      );
    }
    if (!isRegistrationOpen(tournament)) {
      return NextResponse.json(
        { ok: false, error: "التسجيل مغلق أو انتهى وقت التسجيل لهذه البطولة" },
        { status: 400 },
      );
    }

    const format = getTournamentFormat(tournament);
    if (format === "duo") {
      if (!teammateUsername || teammateUsername.length < 2) {
        return NextResponse.json(
          { ok: false, error: "اختر أو اكتب يوزر شريكك" },
          { status: 400 },
        );
      }
      if (teammateUsername.toLowerCase() === username.toLowerCase()) {
        return NextResponse.json(
          { ok: false, error: "لا يجوز تكرار نفس اليوزر داخل التيم" },
          { status: 400 },
        );
      }
    }

    const pending = tournament.pendingRegistrations ?? [];
    const namesInPending = pending.flatMap((r) =>
      memberNames(r).map((x) => x.toLowerCase()),
    );
    const submitting = memberNames({
      username,
      teammateUsername: format === "duo" ? teammateUsername : undefined,
      teammate2Username:
        format === "duo" && teammate2Username ? teammate2Username : undefined,
    });
    const taken = submitting.find((u) =>
      namesInPending.includes(u.toLowerCase()),
    );
    if (taken) {
      return NextResponse.json(
        {
          ok: false,
          error: `اليوزر ${taken} مسجّل مسبقاً في البطولة مع شخص آخر`,
        },
        { status: 409 },
      );
    }

    // يُسمح بالتسجيل فوق العدد المطلوب (قائمة انتظار / زيادة للقرعة)
    // أي يوزر جديد يُنشأ له حساب تلقائياً

    const mainRes = await ensureUnclaimedProfile(username);
    if (!mainRes.ok) {
      return NextResponse.json(
        { ok: false, error: mainRes.error },
        { status: 400 },
      );
    }
    const mateRes =
      format === "duo" && teammateUsername
        ? await ensureUnclaimedProfile(teammateUsername)
        : null;
    if (mateRes && !mateRes.ok) {
      return NextResponse.json(
        { ok: false, error: mateRes.error },
        { status: 400 },
      );
    }
    const mate2Res =
      format === "duo" && teammate2Username
        ? await ensureUnclaimedProfile(teammate2Username)
        : null;
    if (mate2Res && !mate2Res.ok) {
      return NextResponse.json(
        { ok: false, error: mate2Res.error },
        { status: 400 },
      );
    }

    const main = mainRes.profile;
    const mate = mateRes && mateRes.ok ? mateRes.profile : null;
    const mate2 = mate2Res && mate2Res.ok ? mate2Res.profile : null;

    const session = await getSession();
    const requestRow = {
      id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: main.username,
      userId: main.id || session?.id,
      teammateUsername: format === "duo" ? mate?.username : undefined,
      teammateUserId: format === "duo" ? mate?.id : undefined,
      teammate2Username:
        format === "duo" && teammate2Username ? mate2?.username : undefined,
      teammate2UserId:
        format === "duo" && teammate2Username ? mate2?.id : undefined,
      createdAt: new Date().toISOString(),
    };

    const result = await appendPendingRegistration(tournament.id, requestRow);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }

    const createdProfiles = [
      mainRes.created ? mainRes.profile : null,
      mateRes && mateRes.ok && mateRes.created ? mateRes.profile : null,
      mate2Res && mate2Res.ok && mate2Res.created ? mate2Res.profile : null,
    ].filter(Boolean);

    return NextResponse.json({
      ok: true,
      request: requestRow,
      tournament: result.tournament,
      pendingRegistrations: result.tournament.pendingRegistrations ?? [],
      createdProfiles: createdProfiles.map((p) => ({
        id: p!.id,
        username: p!.username,
        avatar:
          (p!.data as { avatar?: string } | null)?.avatar || "/logo.png",
        unclaimed: true,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل حفظ التسجيل على السيرفر" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase غير مُعدّ بعد" },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "يجب تسجيل الدخول" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const tournamentId = String(body.tournamentId || "").trim();
    const requestId = String(body.requestId || "").trim();
    if (!tournamentId || !requestId) {
      return NextResponse.json(
        { ok: false, error: "بيانات الحذف ناقصة" },
        { status: 400 },
      );
    }

    const result = await removePendingRegistration(tournamentId, requestId);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      tournament: result.tournament,
      pendingRegistrations: result.tournament.pendingRegistrations ?? [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل حذف التسجيل" },
      { status: 500 },
    );
  }
}

/** تعديل تسجيل موجود (مشرف) — ينعكس على القرعة عند إنشائها */
export async function PATCH(request: Request) {
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
    const tournamentId = String(body.tournamentId || "").trim();
    const requestId = String(body.requestId || "").trim();
    const username = String(body.username || "").trim();
    const teammateUsername = String(body.teammateUsername || "").trim();
    const teammate2Username = String(body.teammate2Username || "").trim();

    if (!tournamentId || !requestId) {
      return NextResponse.json(
        { ok: false, error: "بيانات التعديل ناقصة" },
        { status: 400 },
      );
    }
    if (!username || username.length < 2) {
      return NextResponse.json(
        { ok: false, error: "اختر يوزر Plato صحيح" },
        { status: 400 },
      );
    }

    const tournament = await findTournamentByRef(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { ok: false, error: "رابط التسجيل غير موجود" },
        { status: 404 },
      );
    }

    const existing = (tournament.pendingRegistrations ?? []).find(
      (r) => r.id === requestId,
    );
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "التسجيل غير موجود" },
        { status: 404 },
      );
    }

    const format = getTournamentFormat(tournament);
    if (format === "duo") {
      if (!teammateUsername || teammateUsername.length < 2) {
        return NextResponse.json(
          { ok: false, error: "اختر أو اكتب يوزر شريك التيم" },
          { status: 400 },
        );
      }
      if (teammateUsername.toLowerCase() === username.toLowerCase()) {
        return NextResponse.json(
          { ok: false, error: "لا يجوز تكرار نفس اليوزر داخل التيم" },
          { status: 400 },
        );
      }
    }

    const pending = tournament.pendingRegistrations ?? [];
    const namesInPending = pending
      .filter((r) => r.id !== requestId)
      .flatMap((r) => memberNames(r).map((x) => x.toLowerCase()));
    const submitting = memberNames({
      username,
      teammateUsername: format === "duo" ? teammateUsername : undefined,
      teammate2Username:
        format === "duo" && teammate2Username ? teammate2Username : undefined,
    });
    const taken = submitting.find((u) =>
      namesInPending.includes(u.toLowerCase()),
    );
    if (taken) {
      return NextResponse.json(
        {
          ok: false,
          error: `اليوزر ${taken} مسجّل مسبقاً في البطولة مع شخص آخر`,
        },
        { status: 409 },
      );
    }

    const mainRes = await ensureUnclaimedProfile(username);
    if (!mainRes.ok) {
      return NextResponse.json(
        { ok: false, error: mainRes.error },
        { status: 400 },
      );
    }
    const mateRes =
      format === "duo" && teammateUsername
        ? await ensureUnclaimedProfile(teammateUsername)
        : null;
    if (mateRes && !mateRes.ok) {
      return NextResponse.json(
        { ok: false, error: mateRes.error },
        { status: 400 },
      );
    }
    const mate2Res =
      format === "duo" && teammate2Username
        ? await ensureUnclaimedProfile(teammate2Username)
        : null;
    if (mate2Res && !mate2Res.ok) {
      return NextResponse.json(
        { ok: false, error: mate2Res.error },
        { status: 400 },
      );
    }

    const main = mainRes.profile;
    const mate = mateRes && mateRes.ok ? mateRes.profile : null;
    const mate2 = mate2Res && mate2Res.ok ? mate2Res.profile : null;

    const result = await updatePendingRegistration(tournament.id, requestId, {
      username: main.username,
      userId: main.id,
      teammateUsername: format === "duo" ? mate?.username : undefined,
      teammateUserId: format === "duo" ? mate?.id : undefined,
      teammate2Username:
        format === "duo" && teammate2Username ? mate2?.username : undefined,
      teammate2UserId:
        format === "duo" && teammate2Username ? mate2?.id : undefined,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }

    const createdProfiles = [
      mainRes.created ? mainRes.profile : null,
      mateRes && mateRes.ok && mateRes.created ? mateRes.profile : null,
      mate2Res && mate2Res.ok && mate2Res.created ? mate2Res.profile : null,
    ].filter(Boolean);

    return NextResponse.json({
      ok: true,
      tournament: result.tournament,
      pendingRegistrations: result.tournament.pendingRegistrations ?? [],
      createdProfiles: createdProfiles.map((p) => ({
        id: p!.id,
        username: p!.username,
        avatar:
          (p!.data as { avatar?: string } | null)?.avatar || "/logo.png",
        unclaimed: true,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل تعديل التسجيل" },
      { status: 500 },
    );
  }
}

/** استبدال قائمة المسجّلين (للمشرفين) — مثل تفريغها بعد إنشاء البطولة */
export async function PUT(request: Request) {
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
    const tournamentId = String(body.tournamentId || "").trim();
    if (!tournamentId) {
      return NextResponse.json(
        { ok: false, error: "معرّف التسجيل ناقص" },
        { status: 400 },
      );
    }

    const pendingRegistrations = Array.isArray(body.pendingRegistrations)
      ? body.pendingRegistrations
      : [];

    const result = await replacePendingRegistrations(
      tournamentId,
      pendingRegistrations,
      {
        registrationOpen:
          typeof body.registrationOpen === "boolean"
            ? body.registrationOpen
            : undefined,
        status: body.status,
      },
    );
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      tournament: result.tournament,
      pendingRegistrations: result.tournament.pendingRegistrations ?? [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "فشل تحديث قائمة التسجيل" },
      { status: 500 },
    );
  }
}
