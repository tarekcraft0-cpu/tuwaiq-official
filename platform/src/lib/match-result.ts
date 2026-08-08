import type { BracketMatch, Tournament } from "@/lib/types";

/** نتيجة لعبة لحد 5: الفائز لازم يكون أعلى نتيجة ويوصل 5 على الأقل */
export function validateFirstToFive(score1: number, score2: number) {
  if (!Number.isFinite(score1) || !Number.isFinite(score2)) {
    return { ok: false as const, error: "أدخل نتيجة صحيحة" };
  }
  if (score1 < 0 || score2 < 0) {
    return { ok: false as const, error: "النتيجة ما تقدر تكون سالبة" };
  }
  if (score1 === score2) {
    return { ok: false as const, error: "ما فيه تعادل — لازم يكون في فائز" };
  }
  const high = Math.max(score1, score2);
  const low = Math.min(score1, score2);
  if (high < 5) {
    return {
      ok: false as const,
      error: "اللعب لحد 5 أهداف — الفائز لازم يوصل 5",
    };
  }
  if (low >= 5) {
    return {
      ok: false as const,
      error: "الفائز فقط يوصل 5 — الخسران أقل من 5",
    };
  }
  return { ok: true as const };
}

export function winnerFromScores(
  match: Pick<BracketMatch, "player1Id" | "player2Id">,
  score1: number,
  score2: number,
) {
  if (!match.player1Id || !match.player2Id) return undefined;
  return score1 > score2 ? match.player1Id : match.player2Id;
}

/** المباراة التالية هندسياً: كل مباراتين (2k, 2k+1) → خانة k */
export function resolveNextMatch(
  bracket: BracketMatch[],
  current: Pick<BracketMatch, "round" | "position" | "nextMatchId">,
) {
  if (current.nextMatchId) {
    const byId = bracket.find((m) => m.id === current.nextMatchId);
    if (byId) return byId;
  }
  const targetPos = Math.floor(current.position / 2);
  return bracket.find(
    (m) => m.round === current.round + 1 && m.position === targetPos,
  );
}

/** يحدّث الشجرة: يسجّل النتيجة ويؤهل الفائز للجولة التالية */
export function applyMatchAdvance(
  bracket: BracketMatch[],
  matchId: string,
  winnerId: string,
  score1: number,
  score2: number,
): BracketMatch[] {
  const next = bracket.map((m) => ({ ...m }));
  const current = next.find((m) => m.id === matchId);
  if (!current) return bracket;
  // يسمح بتأهيل طرف واحد بدون خصم (باي)
  if (!current.player1Id && !current.player2Id) return bracket;
  if (winnerId !== current.player1Id && winnerId !== current.player2Id) {
    return bracket;
  }

  current.score1 = score1;
  current.score2 = score2;
  current.winnerId = winnerId;

  const nm = resolveNextMatch(next, current);
  if (nm) {
    current.nextMatchId = nm.id;
    // المباراة الزوجية (0,2,4…) → خانة 1 | الفردية (1,3,5…) → خانة 2
    if (current.position % 2 === 0) nm.player1Id = winnerId;
    else nm.player2Id = winnerId;
  }

  return next;
}

export function withMatchResult(
  tournament: Tournament,
  matchId: string,
  winnerId: string,
  score1: number,
  score2: number,
): Tournament {
  const bracket = applyMatchAdvance(
    tournament.bracket,
    matchId,
    winnerId,
    score1,
    score2,
  );
  return withBracketDerived(tournament, bracket);
}

/**
 * إرجاع نتيجة مباراة خطوة للخلف:
 * يمسح الفائز من الجولة التالية ويعيد المباراة لغير محسومة.
 */
export function applyMatchRevert(
  bracket: BracketMatch[],
  matchId: string,
): { ok: true; bracket: BracketMatch[] } | { ok: false; error: string } {
  const next = bracket.map((m) => ({ ...m }));
  const current = next.find((m) => m.id === matchId);
  if (!current?.winnerId) {
    return { ok: false, error: "ما فيه نتيجة لإرجاعها في هذه المباراة" };
  }
  const winnerId = current.winnerId;

  const nm = resolveNextMatch(next, current);
  if (nm?.winnerId) {
    return {
      ok: false,
      error:
        "هذا الطرف متأهل للجولة اللي بعدها — ارجع نتيجة الجولة التالية أولاً",
    };
  }
  if (nm) {
    const inSlot1 = nm.player1Id === winnerId;
    const inSlot2 = nm.player2Id === winnerId;
    if (inSlot1) nm.player1Id = undefined;
    if (inSlot2) nm.player2Id = undefined;
    if (inSlot1 || inSlot2) {
      nm.score1 = null;
      nm.score2 = null;
      nm.winnerId = undefined;
    }
  }

  current.winnerId = undefined;
  current.score1 = null;
  current.score2 = null;
  return { ok: true, bracket: next };
}

export function withMatchRevert(
  tournament: Tournament,
  matchId: string,
): { ok: true; tournament: Tournament } | { ok: false; error: string } {
  const result = applyMatchRevert(tournament.bracket, matchId);
  if (!result.ok) return result;
  return {
    ok: true,
    tournament: withBracketDerived(tournament, result.bracket),
  };
}

/** تحديث البطل/الحالة من الشجرة بعد أي تعديل */
function withBracketDerived(
  tournament: Tournament,
  bracket: BracketMatch[],
): Tournament {
  const totalRounds = Math.max(...bracket.map((m) => m.round), 1);
  const final = bracket.find((m) => m.round === totalRounds);
  let championId = tournament.championId;
  let runnerUpId = tournament.runnerUpId;
  let status = tournament.status;

  if (final?.winnerId) {
    championId = final.winnerId;
    runnerUpId =
      final.winnerId === final.player1Id ? final.player2Id : final.player1Id;
    status = "finished";
  } else {
    championId = undefined;
    runnerUpId = undefined;
    if (status === "finished" || status === "upcoming") {
      status = "ongoing";
    }
  }

  return {
    ...tournament,
    bracket,
    bracketUpdatedAt: new Date().toISOString(),
    championId,
    runnerUpId,
    status,
    registrationOpen: false,
  };
}

/** المباراة اللي أهّلت هذا الطرف للخانة الحالية */
export function findAdvanceSourceMatch(
  bracket: BracketMatch[],
  matchId: string,
  entryId: string | undefined,
) {
  if (!entryId) return undefined;
  return bracket.find(
    (m) => m.nextMatchId === matchId && m.winnerId === entryId,
  );
}
