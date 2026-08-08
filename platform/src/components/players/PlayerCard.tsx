import Link from "next/link";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { Username } from "@/components/ui/Username";
import { roleBadge, roleLabel } from "@/lib/roles";
import { getShopItem } from "@/lib/shop";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlayerCard({
  player,
  rank,
}: {
  player: Player;
  rank?: number;
}) {
  const frame = player.equipped?.frameId
    ? getShopItem(player.equipped.frameId)
    : undefined;
  const title = player.equipped?.titleId
    ? getShopItem(player.equipped.titleId)
    : undefined;
  const glow = player.equipped?.effectId === "effect-glow";

  return (
    <Link
      href={`/players/${player.id}`}
      className={cn(
        "panel panel-hover block p-4",
        glow && "shadow-[0_0_24px_rgba(212,168,75,0.18)]",
      )}
    >
      <div className="flex items-center gap-3">
        {rank ? (
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--gold)]">
            #{rank}
          </span>
        ) : null}
        <div
          className={cn(
            "rounded-full p-[2px]",
            frame?.id === "frame-gold" && "bg-gradient-to-br from-amber-200 to-amber-600",
            frame?.id === "frame-tuwaiq" && "bg-gradient-to-br from-zinc-200 to-zinc-700",
            frame?.id === "frame-fire" && "bg-gradient-to-br from-orange-400 to-red-600",
          )}
        >
          <SafeAvatar
            src={player.avatar}
            alt={player.username}
            size={52}
            className="ring-1 ring-black/40"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Username as="h3" className="truncate font-bold">
              {player.username}
            </Username>
            {roleBadge(player.role) ? (
              <Badge className="border-[var(--gold)]/50 bg-[var(--gold-dim)] text-[var(--gold-soft)]">
                {roleBadge(player.role)}
              </Badge>
            ) : null}
            {title ? (
              <Badge className="border-[var(--gold)]/40 text-[var(--gold-soft)]">
                {title.preview} {title.name.replace("لقب: ", "")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {roleLabel(player.role) !== "عضو"
              ? roleLabel(player.role)
              : player.rank}{" "}
            · {player.coins} 🪙
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-black/30 py-2">
          <p className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--gold-soft)]">
            {player.stats.rankingPoints}
          </p>
          <p className="text-[var(--muted)]">نقاط</p>
        </div>
        <div className="bg-black/30 py-2">
          <p className="font-[family-name:var(--font-display)] text-base font-bold">
            {player.tournamentsWon}
          </p>
          <p className="text-[var(--muted)]">ألقاب</p>
        </div>
        <div className="bg-black/30 py-2">
          <p className="inline-flex items-center justify-center gap-1 font-[family-name:var(--font-display)] text-base font-bold">
            <Trophy size={12} className="text-[var(--gold)]" />
            {player.winRate}%
          </p>
          <p className="text-[var(--muted)]">فوز</p>
        </div>
      </div>
    </Link>
  );
}
