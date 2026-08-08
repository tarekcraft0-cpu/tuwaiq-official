import type { BracketMatch, Tournament } from "@/lib/types";

function stampTime(value?: string) {
  if (!value) return 0;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * يختار الشجرة الأحدث حسب bracketUpdatedAt.
 * الأحدث يفوز دائماً — حتى لو الإرجاع قلّل عدد المتأهلين.
 */
export function pickPreferredBracket(
  incoming: BracketMatch[] | undefined,
  existing: BracketMatch[] | undefined,
  incomingUpdatedAt?: string,
  existingUpdatedAt?: string,
): BracketMatch[] {
  const a = incoming ?? [];
  const b = existing ?? [];
  if (!b.length) return a;
  if (!a.length) return b;

  const tA = stampTime(incomingUpdatedAt);
  const tB = stampTime(existingUpdatedAt);

  if (tA > tB) return a;
  if (tB > tA) return b;

  // نفس الوقت أو بلا طابع — نسخة الكاتب (incoming) تفوز
  return a;
}

export function withBracketTimestamp(
  tournament: Tournament,
  bracket?: BracketMatch[],
): Tournament {
  return {
    ...tournament,
    bracket: bracket ?? tournament.bracket,
    bracketUpdatedAt: new Date().toISOString(),
  };
}

/** يضيف مشاركاً لأول خانة فاضية بدون إعادة سحب القرعة */
export function placeEntryInBracket(
  bracket: BracketMatch[],
  entryId: string,
): BracketMatch[] | null {
  const next = bracket.map((m) => ({ ...m }));
  const round1 = next
    .filter((m) => m.round === 1)
    .sort((a, b) => a.position - b.position);

  for (const m of round1) {
    if (m.winnerId) continue;
    if (!m.player1Id) {
      m.player1Id = entryId;
      return next;
    }
    if (!m.player2Id) {
      m.player2Id = entryId;
      return next;
    }
  }
  return null;
}
