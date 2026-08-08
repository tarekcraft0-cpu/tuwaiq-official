import type { BracketMatch } from "./types";

/** Next power of 2 greater than or equal to n (min 2). */
export function nextPowerOfTwo(n: number) {
  const size = Math.max(2, Math.floor(n));
  let p = 1;
  while (p < size) p *= 2;
  return p;
}

export function roundLabel(round: number, totalRounds: number) {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "النهائي";
  if (fromEnd === 1) return "نصف النهائي";
  if (fromEnd === 2) return "ربع النهائي";
  const slots = 2 ** (totalRounds - round + 1);
  return `دور الـ${slots}`;
}

/**
 * Build a single-elimination bracket sized to the registered participants.
 * Internally rounds up to the next power of 2, but distributes byes so
 * every round-1 match has at least one player (no empty↔empty slots).
 */
function shuffleIds(ids: string[]) {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * يوزّع المسجّلين على خانات الدور الأول:
 * مباريات كاملة أولاً (0–1 → نصف، 2–3 → نصف…) ثم الباي في الأسفل.
 * كل مباراتين متتاليتين يغذّيان خط مستقيم واحد للجولة التالية.
 */
export function pairParticipantsWithByes(
  participantIds: string[],
  bracketSize: number,
): Array<[string | undefined, string | undefined]> {
  const ids = participantIds.filter(Boolean);
  const n = ids.length;
  const matchCount = Math.max(1, bracketSize / 2);
  const byes = Math.max(0, bracketSize - n);
  // عدد المواجهات الكاملة = (اللاعبون − الباي) / 2 = n - matchCount
  const fullCount = Math.max(0, Math.min(matchCount, n - matchCount));
  const pairs: Array<[string | undefined, string | undefined]> = [];

  let idx = 0;
  for (let i = 0; i < fullCount; i++) {
    pairs.push([ids[idx++], ids[idx++]]);
  }
  // الباي في المواضع المتبقية — كل باي يغذي خانته المخصصة في الجولة التالية
  while (pairs.length < matchCount) {
    const p = ids[idx++];
    pairs.push(p ? [p, undefined] : [undefined, undefined]);
  }
  return pairs;
}

function advanceBye(
  matches: BracketMatch[],
  match: BracketMatch,
  winnerId: string,
  winnerIsP1: boolean,
) {
  match.winnerId = winnerId;
  match.score1 = winnerIsP1 ? 1 : 0;
  match.score2 = winnerIsP1 ? 0 : 1;
  const targetPos = Math.floor(match.position / 2);
  const next =
    (match.nextMatchId
      ? matches.find((m) => m.id === match.nextMatchId)
      : undefined) ||
    matches.find(
      (m) => m.round === match.round + 1 && m.position === targetPos,
    );
  if (!next) return;
  match.nextMatchId = next.id;
  if (match.position % 2 === 0) next.player1Id = winnerId;
  else next.player2Id = winnerId;
}

export function createBracket(
  size: number,
  participantIds: string[] = [],
  options?: { shuffle?: boolean },
): BracketMatch[] {
  const ids = participantIds.filter(Boolean);
  // حجم الشجرة = أقرب قوة 2 تكفي المسجّلين (أو الحجم المطلوب لو ما فيه مسجّلين بعد)
  const bracketSize = nextPowerOfTwo(
    Math.max(2, ids.length > 0 ? ids.length : size),
  );
  const totalRounds = Math.log2(bracketSize);
  const matches: BracketMatch[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const count = bracketSize / 2 ** round;
    for (let position = 0; position < count; position++) {
      // معرف ثابت — حتى لا تُعاد حركة الشجرة وكأنها قرعة جديدة
      const id = `m-r${round}-p${position}`;
      matches.push({
        id,
        round,
        position,
        score1: null,
        score2: null,
      });
    }
  }

  // اربط كل مباراتين متتاليتين (0–1، 2–3…) بمباراة واحدة فوقهم في خط مستقيم
  for (let round = 1; round < totalRounds; round++) {
    const current = matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.position - b.position);
    const nextRound = matches
      .filter((m) => m.round === round + 1)
      .sort((a, b) => a.position - b.position);
    current.forEach((match) => {
      match.nextMatchId = nextRound[Math.floor(match.position / 2)]?.id;
    });
  }

  const round1 = matches
    .filter((m) => m.round === 1)
    .sort((a, b) => a.position - b.position);

  // الافتراضي ثابت — الخلط فقط عند shuffle: true (إنشاء قرعة / إعادة سحب)
  const ordered =
    options?.shuffle === true ? shuffleIds(ids) : [...ids];
  const pairs = pairParticipantsWithByes(ordered, bracketSize);

  round1.forEach((match, i) => {
    const [p1, p2] = pairs[i] ?? [undefined, undefined];
    match.player1Id = p1;
    match.player2Id = p2;

    if (p1 && !p2) advanceBye(matches, match, p1, true);
    else if (!p1 && p2) advanceBye(matches, match, p2, false);
  });

  return matches;
}

export const BRACKET_SIZE_OPTIONS = [4, 8, 16, 32, 64] as const;
