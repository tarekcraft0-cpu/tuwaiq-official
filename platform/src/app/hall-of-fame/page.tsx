"use client";

import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { useStore } from "@/context/StoreContext";
import { getLeaderboards } from "@/lib/data";

export default function HallOfFamePage() {
  const { hallOfFame, getPlayer, players } = useStore();
  const boards = getLeaderboards(players);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">
          HALL OF FAME
        </p>
        <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
          لوحة الشرف
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          أساطير قروب طويق — تُملأ بعد البطولات والإنجازات الحقيقية.
        </p>
      </div>

      {hallOfFame.length === 0 ? (
        <EmptyState
          title="لوحة الشرف بانتظار الأساطير"
          description="بعد تتويج الأبطال ستُضاف أسماؤهم هنا."
        />
      ) : (
        <div className="mb-12 grid gap-4 md:grid-cols-2">
          {hallOfFame.map((entry) => {
            const player = getPlayer(entry.playerId);
            if (!player) return null;
            return (
              <Link
                key={entry.id}
                href={`/players/${player.id}`}
                className="panel panel-hover relative overflow-hidden p-6"
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={140}
                  height={140}
                  className="pointer-events-none absolute -left-4 -bottom-6 opacity-10"
                />
                <div className="relative flex items-center gap-4">
                  <SafeAvatar
                    src={player.avatar}
                    alt={player.username}
                    size={72}
                    className="ring-2 ring-[var(--gold)]/40"
                  />
                  <div>
                    <p className="text-xs text-[var(--gold)]">{entry.year}</p>
                    <h2 className="mt-1 text-xl font-bold">{entry.title}</h2>
                    <p className="mt-1 text-sm text-zinc-300">{player.username}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {entry.reason}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {boards.points[0] ? (
        <>
          <h2 className="section-title mb-4 text-2xl font-bold">
            أفضل اللاعبين حالياً
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "الألقاب",
                player: boards.champions[0],
                value: boards.champions[0]?.tournamentsWon,
              },
              {
                title: "الهداف",
                player: boards.scorers[0],
                value: boards.scorers[0]?.stats.goals,
              },
              {
                title: "الصناعة",
                player: boards.assisters[0],
                value: boards.assisters[0]?.stats.assists,
              },
              {
                title: "النقاط",
                player: boards.points[0],
                value: boards.points[0]?.stats.rankingPoints,
              },
            ].map((item) =>
              item.player ? (
                <Link
                  key={item.title}
                  href={`/players/${item.player.id}`}
                  className="panel panel-hover p-5 text-center"
                >
                  <p className="text-xs text-[var(--gold)]">{item.title}</p>
                  <SafeAvatar
                    src={item.player.avatar}
                    alt={item.player.username}
                    size={64}
                    className="mx-auto mt-3"
                  />
                  <p className="mt-3 font-bold">{item.player.username}</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-[var(--gold-soft)]">
                    {item.value}
                  </p>
                </Link>
              ) : null,
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
