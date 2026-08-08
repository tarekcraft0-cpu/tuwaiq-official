"use client";

import Link from "next/link";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { roundLabel } from "@/lib/bracket";
import { findAdvanceSourceMatch } from "@/lib/match-result";
import type { BracketMatch, Player } from "@/lib/types";
import { cn } from "@/lib/utils";

export type BracketEntry = {
  label: string;
  avatar?: string;
  avatars?: string[];
  href?: string;
};

/** ارتفاع ثابت لكل مباراة عشان الخطوط تبقى مستقيمة */
const MATCH_H = 76;
const MATCH_GAP = 20;
const UNIT = MATCH_H + MATCH_GAP;

function matchTop(round: number, position: number) {
  // كل مباراة في الجولة التالية تتوسّط المباراتين اللي تحتها
  const offset = (2 ** (round - 1) - 1) * (UNIT / 2);
  const step = 2 ** (round - 1) * UNIT;
  return offset + position * step;
}

function Slot({
  entry,
  score,
  winner,
  /** متأهل لهذا الدور (من الدور السابق أو فاز بالمباراة) */
  advanced,
  selectable,
  emptyAction,
  byeSlot,
  onSelect,
}: {
  entry?: BracketEntry;
  score?: number | null;
  winner?: boolean;
  advanced?: boolean;
  selectable?: boolean;
  emptyAction?: boolean;
  byeSlot?: boolean;
  onSelect?: () => void;
}) {
  const faces =
    entry?.avatars && entry.avatars.length > 0
      ? entry.avatars.slice(0, 2)
      : entry
        ? [entry.avatar || "/logo.png"]
        : [];

  const gold = Boolean(winner || advanced);
  const nameClass = winner
    ? "font-bold text-[var(--gold)]"
    : advanced
      ? "font-semibold text-[var(--gold-soft)]"
      : "text-zinc-200";

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        {entry ? (
          <>
            <div className="flex shrink-0 items-center -space-x-2 rtl:space-x-reverse">
              {faces.map((src, i) => (
                <span
                  key={`${entry.label}-${i}`}
                  className={cn(
                    "relative inline-flex rounded-full",
                    gold
                      ? "ring-2 ring-[var(--gold)]/70"
                      : "ring-1 ring-[#121218]",
                  )}
                >
                  <SafeAvatar
                    src={src || "/logo.png"}
                    alt={entry.label}
                    size={22}
                  />
                </span>
              ))}
            </div>
            {entry.href && !selectable ? (
              <Link
                href={entry.href}
                dir="ltr"
                className={cn(
                  "username-ltr truncate text-sm transition hover:opacity-80",
                  nameClass,
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {entry.label}
              </Link>
            ) : (
              <span
                dir="ltr"
                className={cn("username-ltr truncate text-sm", nameClass)}
              >
                {entry.label}
              </span>
            )}
          </>
        ) : (
          <span
            className={cn(
              "text-sm",
              emptyAction
                ? "text-amber-200/90"
                : byeSlot
                  ? "text-zinc-500"
                  : "text-amber-200/90",
            )}
          >
            {emptyAction
              ? "+ اضغط للإضافة"
              : byeSlot
                ? "تأهيل مباشر"
                : "بانتظار المتأهل"}
          </span>
        )}
      </div>
      <span
        className={cn(
          "font-[family-name:var(--font-display)] text-sm",
          gold ? "text-[var(--gold)]" : "text-zinc-400",
        )}
      >
        {score ?? "-"}
      </span>
    </>
  );

  const slotClass = cn(
    "flex w-full items-center justify-between gap-2 border-b border-white/5 px-3 py-2 text-start last:border-b-0 transition",
    winner && "bg-[var(--gold)]/15",
    !winner && advanced && "bg-[var(--gold-dim)]",
    emptyAction && !entry && "bg-amber-500/5",
  );

  if ((selectable || emptyAction) && onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          slotClass,
          "hover:bg-[var(--gold-dim)] focus:bg-[var(--gold-dim)] focus:outline-none",
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={slotClass}>{content}</div>;
}

export function Bracket({
  matches,
  getPlayer,
  getEntry,
  staffMode,
  onSlotClick,
  activeMatchId,
}: {
  matches: BracketMatch[];
  getPlayer?: (id?: string) => Player | undefined;
  getEntry?: (id?: string) => BracketEntry | undefined;
  staffMode?: boolean;
  onSlotClick?: (
    matchId: string,
    side: 1 | 2,
    kind: "empty" | "filled" | "score" | "revert" | "advanced",
    sourceMatchId?: string,
  ) => void;
  activeMatchId?: string | null;
}) {
  if (!matches.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        لم تُنشأ شجرة البطولة بعد.
      </p>
    );
  }

  const resolve = (id?: string): BracketEntry | undefined => {
    if (getEntry) return getEntry(id);
    const player = getPlayer?.(id);
    if (!player) return undefined;
    return {
      label: player.username,
      avatar: player.avatar,
      href: `/players/${player.id}`,
    };
  };

  const rounds = Math.max(...matches.map((m) => m.round), 1);
  const round1Count = Math.max(
    matches.filter((m) => m.round === 1).length,
    1,
  );
  const columnHeight = round1Count * UNIT - MATCH_GAP;

  return (
    <div className="-mx-2 overflow-x-auto scrollbar-thin px-2 pb-4">
      {staffMode ? (
        <p className="mb-3 text-center text-xs text-[var(--gold-soft)]">
          كل مباراتين → خط مستقيم للجولة التالية · فاضية = إضافة · متأهل =
          إرجاع
        </p>
      ) : null}
      <div className="flex min-w-max gap-8 sm:gap-10">
        {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = matches
            .filter((m) => m.round === round)
            .sort((a, b) => a.position - b.position);

          return (
            <div key={round} className="relative w-[240px] sm:w-64">
              <p className="mb-4 text-center text-xs font-semibold tracking-[0.15em] text-[var(--gold)]">
                {roundLabel(round, rounds)}
              </p>
              <div className="relative" style={{ height: columnHeight }}>
                {roundMatches.map((match) => {
                  const bothReady = Boolean(
                    match.player1Id && match.player2Id && !match.winnerId,
                  );
                  const isBye = Boolean(
                    (match.player1Id && !match.player2Id) ||
                      (!match.player1Id && match.player2Id),
                  );
                  const emptyShell =
                    !match.player1Id && !match.player2Id && round === 1;
                  const busy = activeMatchId === match.id;
                  const interactive = Boolean(staffMode && onSlotClick);
                  const decided = Boolean(match.winnerId);
                  const top = matchTop(round, match.position);

                  const handleSide = (side: 1 | 2) => {
                    if (!onSlotClick) return;
                    const has =
                      side === 1 ? match.player1Id : match.player2Id;

                    if (!has) {
                      onSlotClick(match.id, side, "empty");
                      return;
                    }
                    if (match.winnerId) {
                      onSlotClick(match.id, side, "revert");
                      return;
                    }
                    // مباراة جاهزة (دور 16 / ربع / …) → قائمة التأهيل أولاً
                    // مو قائمة إرجاع المصدر من الدور السابق
                    if (bothReady) {
                      onSlotClick(match.id, side, "score");
                      return;
                    }
                    // طرف واحد بانتظار خصم → تأهيل مباشر / استبدال
                    if (isBye) {
                      onSlotClick(match.id, side, "filled");
                      return;
                    }
                    const source = findAdvanceSourceMatch(
                      matches,
                      match.id,
                      has,
                    );
                    if (source) {
                      onSlotClick(match.id, side, "advanced", source.id);
                      return;
                    }
                    onSlotClick(match.id, side, "filled");
                  };

                  const canFill1 = Boolean(
                    interactive && !match.player1Id && !busy,
                  );
                  const canFill2 = Boolean(
                    interactive && !match.player2Id && !busy,
                  );

                  return (
                    <div
                      key={match.id}
                      className="absolute inset-x-0"
                      style={{ top, height: MATCH_H }}
                    >
                      {emptyShell ? (
                        <div className="h-full rounded-xl border border-dashed border-white/10 bg-black/10" />
                      ) : (
                        <div
                          className={cn(
                            "panel relative h-full overflow-hidden border-[var(--gold)]/20",
                            bothReady &&
                              interactive &&
                              "ring-1 ring-[var(--gold)]/30",
                            decided &&
                              interactive &&
                              "ring-1 ring-amber-400/25",
                            busy && "opacity-60",
                          )}
                        >
                          <Slot
                            entry={resolve(match.player1Id)}
                            score={match.score1}
                            winner={match.winnerId === match.player1Id}
                            advanced={Boolean(
                              match.player1Id &&
                                // فائز المباراة = دهبي | خاسر = عادي
                                // دور لاحق قبل الحسم = متأهل لهذا الدور
                                (match.winnerId
                                  ? match.winnerId === match.player1Id
                                  : round > 1),
                            )}
                            selectable={
                              Boolean(
                                interactive &&
                                  (match.player1Id || canFill1),
                              ) && !busy
                            }
                            emptyAction={canFill1}
                            byeSlot={Boolean(
                              isBye && !match.player1Id && !canFill1,
                            )}
                            onSelect={
                              interactive ? () => handleSide(1) : undefined
                            }
                          />
                          <Slot
                            entry={resolve(match.player2Id)}
                            score={match.score2}
                            winner={match.winnerId === match.player2Id}
                            advanced={Boolean(
                              match.player2Id &&
                                (match.winnerId
                                  ? match.winnerId === match.player2Id
                                  : round > 1),
                            )}
                            selectable={
                              Boolean(
                                interactive &&
                                  (match.player2Id || canFill2),
                              ) && !busy
                            }
                            emptyAction={canFill2}
                            byeSlot={Boolean(
                              isBye && !match.player2Id && !canFill2,
                            )}
                            onSelect={
                              interactive ? () => handleSide(2) : undefined
                            }
                          />
                          {decided && interactive && !busy ? (
                            <button
                              type="button"
                              title="إرجاع خطوة للخلف"
                              className="absolute -bottom-0.5 left-1/2 z-10 -translate-x-1/2 translate-y-full rounded-md border border-amber-400/40 bg-[#121218] px-1.5 py-0.5 text-[10px] text-amber-200"
                              onClick={() =>
                                onSlotClick?.(match.id, 1, "revert")
                              }
                            >
                              ↩ إرجاع
                            </button>
                          ) : null}
                        </div>
                      )}
                      {round < rounds ? (
                        <div className="pointer-events-none absolute top-1/2 -left-5 hidden h-px w-5 bg-[var(--gold)]/40 md:block" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
