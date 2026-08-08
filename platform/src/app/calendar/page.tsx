"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/context/StoreContext";
import { gameLabels } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default function CalendarPage() {
  const { tournaments, getPlayer } = useStore();
  const events = tournaments
    .flatMap((t) =>
      t.bracket
        .filter((m) => m.player1Id && m.player2Id)
        .map((m, idx) => ({
          id: m.id,
          tournament: t,
          player1: getPlayer(m.player1Id),
          player2: getPlayer(m.player2Id),
          date: t.startDate,
          status: m.winnerId
            ? "finished"
            : t.status === "ongoing"
              ? "live"
              : "pending",
          order: idx,
        })),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">CALENDAR</p>
        <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
          تقويم المباريات
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          مواعيد المواجهات وحالة كل مباراة.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="التقويم فارغ"
          description="بعد إنشاء البطولات وتوزيع اللاعبين ستظهر المباريات هنا."
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/tournaments/${event.tournament.id}`}
              className="panel panel-hover flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs text-[var(--gold)]">
                  {event.tournament.name} ·{" "}
                  {gameLabels[event.tournament.game]}
                </p>
                <p className="mt-1 text-lg font-bold">
                  {event.player1?.username} ضد {event.player2?.username}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {formatDate(event.date)}
                </p>
              </div>
              <span className="text-sm text-[var(--gold-soft)]">
                {event.status === "finished"
                  ? "انتهت"
                  : event.status === "live"
                    ? "جارية / قريبة"
                    : "لم تبدأ"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
