"use client";

import { useMemo, useState } from "react";
import { PlayerCard } from "@/components/players/PlayerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/context/StoreContext";

export default function PlayersPage() {
  const { players } = useStore();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...players]
      .sort((a, b) => b.stats.rankingPoints - a.stats.rankingPoints)
      .filter((p) => !q || p.username.toLowerCase().includes(q));
  }, [players, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--gold)]">PLAYERS</p>
          <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
            اللاعبون
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            ملفات اللاعبين الحقيقية بعد التسجيل.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن لاعب..."
          className="input-field sm:w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="لا لاعبين بعد"
          description="كن أول من يسجّل بيوزر Plato ويرفع صورته."
          actionHref="/register"
          actionLabel="إنشاء حساب"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((player, i) => (
            <PlayerCard key={player.id} player={player} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
