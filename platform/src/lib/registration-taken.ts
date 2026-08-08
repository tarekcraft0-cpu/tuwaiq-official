import type { Tournament } from "@/lib/types";
import { getTournamentFormat } from "@/lib/tournament-format";

/** يوزرات محجوزة في رابط التسجيل (بانتظار أو داخل البطولة) */
export function getTakenUsernames(
  tournament: Tournament,
  options?: { excludeRequestId?: string },
): Map<string, string> {
  const taken = new Map<string, string>();
  const mark = (name: string | undefined, reason: string) => {
    const key = (name || "").trim().toLowerCase();
    if (key && !taken.has(key)) taken.set(key, reason);
  };

  for (const req of tournament.pendingRegistrations ?? []) {
    if (options?.excludeRequestId && req.id === options.excludeRequestId) {
      continue;
    }
    const others = [req.teammateUsername, req.teammate2Username]
      .filter(Boolean)
      .join(" و ");
    mark(
      req.username,
      others
        ? `مسجّل في البطولة مع ${others}`
        : "مسجّل مسبقاً في هذه البطولة",
    );
    mark(
      req.teammateUsername,
      `مسجّل في البطولة مع ${req.username}`,
    );
    mark(
      req.teammate2Username,
      `مسجّل في البطولة مع ${req.username}`,
    );
  }

  const format = getTournamentFormat(tournament);
  if (format === "duo") {
    for (const team of tournament.teams ?? []) {
      if (!tournament.participants.includes(team.id)) continue;
      // أسماء اللاعبين غير متوفرة هنا — يُعالَج عبر المعرفات في الواجهة إن لزم
    }
  }

  return taken;
}

export function registrationMemberNames(req: {
  username: string;
  teammateUsername?: string;
  teammate2Username?: string;
}) {
  return [req.username, req.teammateUsername, req.teammate2Username]
    .map((x) => (x || "").trim())
    .filter(Boolean);
}
