"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/context/StoreContext";

export default function VotesPage() {
  const { user, votes, setVotes } = useStore();
  const [message, setMessage] = useState("");
  const active = useMemo(() => votes.filter((v) => v.active), [votes]);

  function castVote(voteId: string, optionId: string) {
    if (!user) {
      setMessage("يجب تسجيل الدخول للتصويت.");
      return;
    }
    if (user.role === "admin" || user.role === "owner") {
      setMessage("التصويت مخصص للأعضاء.");
      return;
    }
    setVotes((prev) =>
      prev.map((vote) => {
        if (vote.id !== voteId) return vote;
        if (vote.votedBy.includes(user.id)) {
          setMessage("لقد صوّت مسبقاً على هذا السؤال.");
          return vote;
        }
        setMessage("تم تسجيل صوتك بنجاح.");
        return {
          ...vote,
          totalVotes: vote.totalVotes + 1,
          votedBy: [...vote.votedBy, user.id],
          options: vote.options.map((opt) =>
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt,
          ),
        };
      }),
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">VOTES</p>
        <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
          التصويتات
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          صوّت على قرارات القروب وشاهد النتائج فوراً.
        </p>
        {message ? (
          <p className="mt-4 text-sm text-[var(--gold-soft)]">{message}</p>
        ) : null}
      </div>

      {active.length === 0 ? (
        <EmptyState
          title="لا تصويتات حالياً"
          description="عند إنشاء تصويت من لوحة المشرفين سيظهر هنا مع رسوم بيانية."
        />
      ) : (
        <div className="space-y-8">
          {active.map((vote) => {
            const chartData = vote.options.map((o) => ({
              name: o.label,
              votes: o.votes,
            }));
            const voted = user ? vote.votedBy.includes(user.id) : false;

            return (
              <section key={vote.id} className="panel p-5 sm:p-6">
                <h2 className="text-xl font-bold">{vote.question}</h2>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  ينتهي في {vote.endsAt} · {vote.totalVotes} صوت
                </p>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    {vote.options.map((opt) => {
                      const pct = vote.totalVotes
                        ? Math.round((opt.votes / vote.totalVotes) * 100)
                        : 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={
                            voted ||
                            !user ||
                            user.role === "admin" ||
                            user.role === "owner"
                          }
                          onClick={() => castVote(vote.id, opt.id)}
                          className="w-full border border-white/10 bg-black/20 p-4 text-start transition duration-300 hover:border-[var(--gold)]/40 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-semibold">{opt.label}</span>
                            <span className="text-[var(--gold-soft)]">
                              {opt.votes} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 bg-white/5">
                            <div
                              className="h-full bg-gradient-to-l from-[var(--gold)] to-[var(--gold-soft)] transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" stroke="#9a958c" fontSize={12} />
                        <YAxis
                          stroke="#9a958c"
                          fontSize={12}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#121218",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        />
                        <Bar
                          dataKey="votes"
                          fill="#d4a84b"
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
