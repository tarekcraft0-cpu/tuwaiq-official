"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { useStore } from "@/context/StoreContext";

export default function HeadToHeadPage() {
  const { players, tournaments } = useStore();
  const members = players;
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const playerA = members.find((p) => p.id === a) ?? members[0];
  const playerB =
    members.find((p) => p.id === b) ??
    members.find((p) => p.id !== playerA?.id);

  const result = useMemo(() => {
    if (!playerA || !playerB || playerA.id === playerB.id) return null;
    const meetings = tournaments.flatMap((t) =>
      t.bracket
        .filter(
          (m) =>
            m.winnerId &&
            ((m.player1Id === playerA.id && m.player2Id === playerB.id) ||
              (m.player1Id === playerB.id && m.player2Id === playerA.id)),
        )
        .map((m) => ({ ...m, tournamentName: t.name })),
    );
    return {
      meetings,
      winsA: meetings.filter((m) => m.winnerId === playerA.id).length,
      winsB: meetings.filter((m) => m.winnerId === playerB.id).length,
    };
  }, [playerA, playerB, tournaments]);

  if (members.length < 2) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
        <h1 className="section-title mb-6 text-3xl font-bold">تاريخ المواجهات</h1>
        <EmptyState
          title="يحتاج لاعبين على الأقل"
          description="بعد تسجيل عضوين ووجود مباريات بينهما يمكنك مقارنة السجل."
          actionHref="/register"
          actionLabel="إنشاء حساب"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">
          HEAD TO HEAD
        </p>
        <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
          تاريخ المواجهات
        </h1>
      </div>

      <div className="panel mb-8 grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-2 block text-[var(--muted)]">اللاعب الأول</span>
          <select
            value={playerA?.id}
            onChange={(e) => setA(e.target.value)}
            className="input-field"
          >
            {members.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-2 block text-[var(--muted)]">اللاعب الثاني</span>
          <select
            value={playerB?.id}
            onChange={(e) => setB(e.target.value)}
            className="input-field"
          >
            {members.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username}
              </option>
            ))}
          </select>
        </label>
      </div>

      {playerA && playerB && result ? (
        <>
          <div className="panel mb-6 flex items-center justify-between gap-4 p-6">
            <div className="text-center">
              <SafeAvatar
                src={playerA.avatar}
                alt={playerA.username}
                size={72}
                className="mx-auto"
              />
              <p className="mt-2 font-bold">{playerA.username}</p>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--gold-soft)]">
                {result.winsA}
              </p>
            </div>
            <div className="text-center text-[var(--muted)]">VS</div>
            <div className="text-center">
              <SafeAvatar
                src={playerB.avatar}
                alt={playerB.username}
                size={72}
                className="mx-auto"
              />
              <p className="mt-2 font-bold">{playerB.username}</p>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--gold-soft)]">
                {result.winsB}
              </p>
            </div>
          </div>

          {result.meetings.length === 0 ? (
            <EmptyState
              title="لا مواجهات مسجّلة"
              description="بعد لعب مباريات بينهما ستظهر النتائج هنا."
            />
          ) : (
            <div className="space-y-3">
              {result.meetings.map((m) => (
                <div key={m.id} className="panel px-4 py-3">
                  <p className="text-xs text-[var(--gold)]">{m.tournamentName}</p>
                  <p className="mt-1 font-semibold">
                    {m.score1} - {m.score2} · الفائز:{" "}
                    {m.winnerId === playerA.id
                      ? playerA.username
                      : playerB.username}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
