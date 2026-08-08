"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { useStore } from "@/context/StoreContext";
import { getLeaderboards } from "@/lib/data";
import { roleBadge, roleLabel } from "@/lib/roles";

export default function RankingsPage() {
  const { players } = useStore();
  const boards = getLeaderboards(players);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">RANKING</p>
        <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
          أفضل اللاعبين
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          ترتيب حي يعتمد على النقاط والأداء — يبدأ فارغاً ويتحدث مع البطولات.
        </p>
      </div>

      {boards.points.length === 0 ? (
        <EmptyState
          title="الترتيب فارغ"
          description="بعد تسجيل الأعضاء وبدء البطولات سيظهر أفضل 100 هنا تلقائياً."
          actionHref="/register"
          actionLabel="إنشاء حساب"
        />
      ) : (
        <>
          <div className="panel mb-12 overflow-hidden">
            <div className="border-b border-white/5 px-4 py-3 text-sm text-[var(--muted)]">
              الترتيب العام بالنقاط
            </div>
            <div className="divide-y divide-white/5">
              {boards.points.map((player, index) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition duration-300 hover:bg-white/[0.03]"
                >
                  <span className="w-8 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--gold)]">
                    #{index + 1}
                  </span>
                  <SafeAvatar
                    src={player.avatar}
                    alt={player.username}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        dir="ltr"
                        className="username-ltr truncate font-semibold"
                      >
                        {player.username}
                      </p>
                      {roleBadge(player.role) ? (
                        <span className="rounded-full border border-[var(--gold)]/40 bg-[var(--gold-dim)] px-2 py-0.5 text-[10px] text-[var(--gold-soft)]">
                          {roleBadge(player.role)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {roleLabel(player.role) !== "عضو"
                        ? roleLabel(player.role)
                        : player.rank}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-[family-name:var(--font-display)] font-bold text-[var(--gold-soft)]">
                      {player.stats.rankingPoints}
                    </p>
                    <p className="text-xs text-[var(--muted)]">نقطة</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                title: "أكثر تحقيقاً للبطولات",
                list: boards.champions,
                value: (p: (typeof boards.champions)[0]) => p.tournamentsWon,
              },
              {
                title: "أفضل هداف",
                list: boards.scorers,
                value: (p: (typeof boards.scorers)[0]) => p.stats.goals,
              },
              {
                title: "أكثر صناعة أهداف",
                list: boards.assisters,
                value: (p: (typeof boards.assisters)[0]) => p.stats.assists,
              },
              {
                title: "أكثر مشاركة",
                list: boards.active,
                value: (p: (typeof boards.active)[0]) => p.tournamentsPlayed,
              },
            ].map((board) => (
              <section key={board.title} className="panel p-5">
                <h2 className="mb-4 text-lg font-bold">🥇 {board.title}</h2>
                <div className="space-y-3">
                  {board.list.slice(0, 5).map((player, i) => (
                    <Link
                      key={player.id}
                      href={`/players/${player.id}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--gold)]">#{i + 1}</span>
                        <SafeAvatar
                          src={player.avatar}
                          alt={player.username}
                          size={32}
                        />
                        <span
                          dir="ltr"
                          className="username-ltr text-sm font-semibold"
                        >
                          {player.username}
                        </span>
                      </div>
                      <span className="font-[family-name:var(--font-display)] text-sm font-bold">
                        {board.value(player)}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
