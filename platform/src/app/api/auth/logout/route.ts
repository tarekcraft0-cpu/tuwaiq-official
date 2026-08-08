import { NextResponse } from "next/server";
import { withClearedSessionCookie } from "@/lib/auth-server";

export async function POST() {
  return withClearedSessionCookie(NextResponse.json({ ok: true }));
}
