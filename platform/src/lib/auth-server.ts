import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { Player, UserRole } from "@/lib/types";

const COOKIE = "tuwaiq_session";

function secret() {
  return process.env.AUTH_SECRET || "tuwaiq-dev-secret-change-me";
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 8);
}

export async function verifyPassword(password: string, hash: string) {
  if (!password || !hash || !hash.startsWith("$2")) return false;
  return bcrypt.compare(password, hash);
}

export function publicPlayer(player: Player): Player {
  return { ...player, password: "" };
}

export type SessionUser = {
  id: string;
  username: string;
  avatar: string;
  role: UserRole;
};

/** الكوكي صغير — لا نخزن صور data: URL داخل الجلسة */
export function compactSessionUser(user: SessionUser): SessionUser {
  const avatar =
    user.avatar &&
    !user.avatar.startsWith("data:") &&
    user.avatar.length < 180
      ? user.avatar
      : "/logo.png";
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    avatar,
  };
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function encodeSession(user: SessionUser) {
  const body = Buffer.from(
    JSON.stringify(compactSessionUser(user)),
    "utf8",
  ).toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function decodeSession(token?: string | null): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 60, // 60 يوم
};

/** يضبط الكوكي على الاستجابة — أضمن في Route Handlers */
export function withSessionCookie(res: NextResponse, user: SessionUser) {
  res.cookies.set(COOKIE, encodeSession(user), cookieOptions);
  return res;
}

export function withClearedSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}

export async function setSessionCookie(user: SessionUser) {
  const jar = await cookies();
  jar.set(COOKIE, encodeSession(user), cookieOptions);
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const session = decodeSession(jar.get(COOKIE)?.value);
  if (!session) return null;

  // اقرأ الرتبة الحية من قاعدة البيانات — حتى المشرف الجديد يقدر يأهّل فوراً
  try {
    const { isSupabaseConfigured } = await import("@/lib/supabase/admin");
    if (!isSupabaseConfigured()) return session;
    const { findProfileById } = await import("@/lib/server-store");
    const row = await findProfileById(session.id);
    if (!row) return session;
    const data = (row.data || {}) as {
      role?: UserRole;
      avatar?: string;
    };
    const role =
      data.role === "owner" || data.role === "admin" || data.role === "member"
        ? data.role
        : session.role;
    return compactSessionUser({
      id: row.id,
      username: row.username || session.username,
      avatar: data.avatar || session.avatar,
      role,
    });
  } catch {
    return session;
  }
}
