import type { Tournament } from "@/lib/types";

/** أحرف واضحة للقراءة والنسخ (بدون 0/O/1/l) */
const SHARE_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";

/** توليد رمز مشاركة قصير لروابط التسجيل */
export function makeShareCode(length = 4) {
  let out = "";
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < length; i++) {
    out += SHARE_ALPHABET[bytes[i]! % SHARE_ALPHABET.length];
  }
  return out;
}

export function makeUniqueShareCode(
  existing: Iterable<string>,
  length = 4,
) {
  const used = new Set(
    [...existing].map((c) => c.trim().toLowerCase()).filter(Boolean),
  );
  for (let attempt = 0; attempt < 40; attempt++) {
    const code = makeShareCode(length);
    if (!used.has(code)) return code;
  }
  return makeShareCode(length + 1);
}

/** هل المعرف قصير بما يكفي ليُستخدم مباشرة في الرابط؟ */
export function isShortShareRef(ref: string) {
  const v = ref.trim();
  if (!v || v.length > 8) return false;
  if (v.startsWith("reg-") || v.startsWith("t-")) return false;
  return /^[a-z0-9]+$/i.test(v);
}

/** رمز المشاركة الظاهر في الرابط */
export function registrationShareCode(tournament: Tournament) {
  if (tournament.shareCode && isShortShareRef(tournament.shareCode)) {
    return tournament.shareCode;
  }
  if (isShortShareRef(tournament.id)) return tournament.id;
  return tournament.shareCode || tournament.id;
}

/** رابط مخصص لخانة التسجيل — قصير قدر الإمكان (/j/xxxx) */
export function registrationSharePath(tournament: Tournament | string) {
  const code =
    typeof tournament === "string"
      ? tournament
      : registrationShareCode(tournament);
  return `/j/${code}`;
}

/** رمز قصير لرابط القرعة/البطولة */
export function tournamentShareCode(tournament: Tournament) {
  if (tournament.shareCode && isShortShareRef(tournament.shareCode)) {
    return tournament.shareCode;
  }
  if (isShortShareRef(tournament.id)) return tournament.id;
  return tournament.shareCode || tournament.id;
}

/** رابط قصير للقرعة (/t/xxxx) — بدل /tournaments/t-1723… */
export function tournamentSharePath(tournament: Tournament | string) {
  const code =
    typeof tournament === "string"
      ? tournament
      : tournamentShareCode(tournament);
  if (typeof tournament !== "string" && !isShortShareRef(code)) {
    return `/tournaments/${tournament.id}`;
  }
  if (typeof tournament === "string" && !isShortShareRef(code)) {
    return `/tournaments/${code}`;
  }
  return `/t/${code}`;
}

/** إيجاد بطولة أو رابط تسجيل بالمعرف أو برمز المشاركة القصير */
export function findTournamentByShareRef(
  tournaments: Tournament[],
  ref: string,
) {
  const key = decodeURIComponent(ref || "").trim().toLowerCase();
  if (!key) return undefined;
  return tournaments.find((t) => {
    if (t.deleted) return false;
    if (t.id.toLowerCase() === key) return true;
    if (t.shareCode?.toLowerCase() === key) return true;
    return false;
  });
}

/** إيجاد خانة التسجيل بالمعرف أو برمز المشاركة القصير */
export function findRegistrationByShareRef(
  tournaments: Tournament[],
  ref: string,
) {
  return findTournamentByShareRef(tournaments, ref);
}

/** هل التسجيل مفتوح الآن حسب العلم اليدوي + الموعد النهائي؟ */
export function isRegistrationOpen(tournament: Tournament) {
  if (tournament.deleted) return false;
  if (tournament.status === "finished") return false;
  if (!tournament.registrationOpen) return false;
  if (!tournament.registrationEndsAt) return tournament.registrationOpen;
  return new Date(tournament.registrationEndsAt).getTime() > Date.now();
}

export function registrationStatusLabel(tournament: Tournament) {
  if (tournament.status === "finished") return "مغلق";
  if (!tournament.registrationOpen) return "مغلق يدوياً";
  if (!tournament.registrationEndsAt) {
    return tournament.registrationOpen ? "مفتوح" : "مغلق";
  }
  if (isRegistrationOpen(tournament)) return "مفتوح";
  return "انتهى وقت التسجيل";
}

export function formatRegistrationDeadline(date?: string) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

/** مسار آمن للرجوع بعد إنشاء الحساب / الدخول */
export function safeNextPath(next?: string | null) {
  if (!next) return null;
  const value = next.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("://")) return null;
  return value;
}
