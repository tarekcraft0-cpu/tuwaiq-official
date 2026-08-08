import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { isStaff } from "@/lib/roles";
import { readSiteDb, writeSiteDb } from "@/lib/tuwaiq-db";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ memberId: string; opinionId: string }> },
) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 403 });
  }

  const { memberId, opinionId } = await context.params;
  const db = readSiteDb();
  const member = db.members.find((m) => m.id === memberId);
  if (!member) {
    return NextResponse.json({ ok: false, error: "العضو غير موجود" }, { status: 404 });
  }
  const before = (member.opinions || []).length;
  member.opinions = (member.opinions || []).filter((o) => o.id !== opinionId);
  if (member.opinions.length === before) {
    return NextResponse.json({ ok: false, error: "الرأي غير موجود" }, { status: 404 });
  }
  writeSiteDb(db);
  return NextResponse.json({ ok: true });
}
