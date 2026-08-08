"use client";

import { useMemo, useState } from "react";
import { RegistrationCard } from "@/components/registration/RegistrationCard";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/context/StoreContext";
import { gameLabels } from "@/lib/data";
import { isRegistrationOpen } from "@/lib/registration";
import { isStaff } from "@/lib/roles";
import type { GameType } from "@/lib/types";
import { cn } from "@/lib/utils";

const filters: Array<{ id: "all" | GameType; label: string }> = [
  { id: "all", label: "الكل" },
  { id: "football", label: "كرة القدم" },
  { id: "billiards", label: "بلياردو" },
  { id: "tennis", label: "تنس" },
  { id: "chess", label: "شطرنج" },
  { id: "other", label: "أخرى" },
];

export default function TournamentsPage() {
  const { tournaments, user, players } = useStore();
  const [game, setGame] = useState<"all" | GameType>("all");
  const me = players.find((p) => p.id === user?.id);
  const staff = isStaff(me?.role ?? user?.role);

  const filtered = useMemo(() => {
    const real = tournaments.filter((t) => !t.registrationOnly);
    return game === "all" ? real : real.filter((t) => t.game === game);
  }, [tournaments, game]);

  const openRegistrations = useMemo(
    () =>
      tournaments.filter(
        (t) => t.registrationOnly && isRegistrationOpen(t),
      ),
    [tournaments],
  );

  const groups = [
    {
      title: "جارية الآن",
      items: filtered.filter((t) => t.status === "ongoing"),
    },
    {
      title: "قادمة / التسجيل مفتوح",
      items: filtered.filter((t) => t.status === "upcoming"),
    },
    {
      title: "سجل البطولات",
      items: filtered.filter((t) => t.status === "finished"),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">
          TOURNAMENTS
        </p>
        <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
          البطولات
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          سجّل يوزرك داخل صفحة البطولة للمشاركة، وادعم دوريات بأي حجم.
          {staff
            ? " كمشرف يظهر لك زر إعدادات البطولة لتأهيل الفائز وتعديل القرعة."
            : ""}
        </p>
      </div>

      {openRegistrations.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold">تسجيل للبطولة القادمة</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openRegistrations.map((t) => (
              <RegistrationCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-8 flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setGame(f.id)}
            className={cn(
              "shrink-0 px-3 py-2 text-sm transition duration-300",
              game === f.id
                ? "bg-[var(--gold-dim)] text-[var(--gold-soft)]"
                : "border border-white/10 text-zinc-300",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {tournaments.length === 0 && openRegistrations.length === 0 ? (
        <EmptyState
          title="لا بطولات بعد"
          description="المشرفون سيضيفون أول دوري، ثم يفتحون خانة التسجيل للأعضاء."
          actionHref={staff ? "/admin" : "/login?portal=admin"}
          actionLabel={staff ? "لوحة المشرفين" : "دخول المشرفين"}
        />
      ) : filtered.length === 0 ? (
        openRegistrations.length > 0 ? (
          <p className="text-sm text-[var(--muted)]">
            لا توجد بطولات ضمن هذا الفلتر؛ يمكنك التسجيل للبطولة القادمة من الأعلى.
          </p>
        ) : (
          <EmptyState
            title={`لا بطولات في ${game === "all" ? "القائمة" : gameLabels[game]}`}
            description="جرّب فلتر لعبة آخر."
          />
        )
      ) : (
        <div className="space-y-12">
          {groups.map((group) =>
            group.items.length ? (
              <section key={group.title}>
                <h2 className="mb-4 text-xl font-bold">{group.title}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((t) => (
                    <TournamentCard key={t.id} tournament={t} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
