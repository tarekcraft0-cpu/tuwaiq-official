import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { isStaff } from "@/lib/roles";
import { readSiteDb } from "@/lib/tuwaiq-db";
import { ensureOwnerAccount } from "@/lib/ensure-owner";

export async function GET() {
  try {
    await ensureOwnerAccount();
  } catch {
    // لا نمنع قراءة الآراء لو فشل ضمان المالك
  }

  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 403 });
  }

  const db = readSiteDb();
  const groupOpinions = (db.groupOpinions || [])
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const memberOpinions = (db.members || [])
    .flatMap((m) =>
      (m.opinions || []).map((op) => ({
        ...op,
        memberId: m.id,
        memberName: m.displayName || m.username,
        memberUsername: m.username,
      })),
    )
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return NextResponse.json({
    ok: true,
    groupOpinions,
    memberOpinions,
  });
}
