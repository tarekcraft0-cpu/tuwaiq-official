import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { isStaff } from "@/lib/roles";
import { readSiteDb, writeSiteDb } from "@/lib/tuwaiq-db";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  const db = readSiteDb();
  const before = db.groupOpinions.length;
  db.groupOpinions = db.groupOpinions.filter((o) => o.id !== id);
  if (db.groupOpinions.length === before) {
    return NextResponse.json({ ok: false, error: "الرأي غير موجود" }, { status: 404 });
  }
  writeSiteDb(db);
  return NextResponse.json({ ok: true });
}
