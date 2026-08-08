import type { Player, Tournament, TournamentFormat } from "@/lib/types";

export const formatLabels: Record<TournamentFormat, string> = {
  solo: "فردية",
  duo: "جماعية (تيم)",
};

export function getTournamentFormat(t: Tournament): TournamentFormat {
  return t.format === "duo" ? "duo" : "solo";
}

export function entryLabel(
  tournament: Tournament,
  entryId: string | undefined,
  getPlayer: (id?: string) => Player | undefined,
): {
  label: string;
  avatar?: string;
  /** أفتارات أعضاء التيم (للعرض المزدوج في الشجرة) */
  avatars?: string[];
  href?: string;
} | undefined {
  if (!entryId) return undefined;

  if (getTournamentFormat(tournament) === "duo") {
    const team = (tournament.teams ?? []).find((x) => x.id === entryId);
    if (!team) return { label: "فريق", avatars: ["/logo.png", "/logo.png"] };
    const p1 = getPlayer(team.player1Id);
    const p2 = getPlayer(team.player2Id);
    const p3 = getPlayer(team.player3Id);
    const names = [p1?.username, p2?.username, p3?.username]
      .filter(Boolean)
      .join(" + ");
    const avatars = [
      p1?.avatar || "/logo.png",
      p2?.avatar || "/logo.png",
      ...(p3 ? [p3.avatar || "/logo.png"] : []),
    ];
    return {
      label: team.name || names || "فريق",
      avatar: avatars[0],
      avatars,
    };
  }

  const player = getPlayer(entryId);
  if (!player) return { label: "لاعب" };
  return {
    label: player.username,
    avatar: player.avatar,
    avatars: [player.avatar || "/logo.png"],
    href: `/players/${player.id}`,
  };
}

/** لاعبون المرتبطون بمدخل الشجرة (لاعب أو فريق ثنائي) */
export function playerIdsForEntry(
  tournament: Tournament,
  entryId: string | undefined,
): string[] {
  if (!entryId) return [];
  const teams = tournament.teams ?? [];
  const team = teams.find((x) => x.id === entryId);
  if (team) {
    return [team.player1Id, team.player2Id, team.player3Id].filter(
      (x): x is string => Boolean(x),
    );
  }
  // Duo بدون سجل الفريق: لا نرجع معرف التيم كلاعب وهمي
  if (getTournamentFormat(tournament) === "duo") {
    // إن كان المدخل لاعبًا مباشرًا (شجرة مختلطة / بيانات ناقصة)
    return [entryId];
  }
  return [entryId];
}

export function isUserInTournament(
  tournament: Tournament,
  userId?: string,
): boolean {
  if (!userId) return false;
  if (getTournamentFormat(tournament) === "duo") {
    return (tournament.teams ?? []).some(
      (team) =>
        tournament.participants.includes(team.id) &&
        (team.player1Id === userId ||
          team.player2Id === userId ||
          team.player3Id === userId),
    );
  }
  return tournament.participants.includes(userId);
}
