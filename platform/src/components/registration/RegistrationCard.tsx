"use client";

import Link from "next/link";
import { ClipboardList, Settings2, Users } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import {
  formatRegistrationDeadline,
  isRegistrationOpen,
  registrationSharePath,
} from "@/lib/registration";
import { isStaff } from "@/lib/roles";
import { formatLabels, getTournamentFormat } from "@/lib/tournament-format";
import type { Tournament } from "@/lib/types";

export function RegistrationCard({ tournament }: { tournament: Tournament }) {
  const { user, players } = useStore();
  const me = players.find((p) => p.id === user?.id);
  const staff = isStaff(me?.role ?? user?.role);
  const format = getTournamentFormat(tournament);
  const open = isRegistrationOpen(tournament);
  const pending = tournament.pendingRegistrations?.length ?? 0;
  const href = registrationSharePath(tournament);

  return (
    <div className="panel panel-hover overflow-hidden border-[var(--gold)]/35">
      <Link href={href} className="block p-5">
        <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)]">
          تسجيل للبطولة القادمة
        </p>
        <h3 className="mt-2 flex items-center gap-2 text-xl font-bold">
          <ClipboardList className="text-[var(--gold)]" size={22} />
          {tournament.name}
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {formatLabels[format]} ·{" "}
          {format === "duo" ? `${tournament.size} فرق` : `${tournament.size} لاعب`}
          {tournament.registrationEndsAt
            ? ` · يغلق ${formatRegistrationDeadline(tournament.registrationEndsAt)}`
            : ""}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span
            className={
              open ? "text-[var(--gold-soft)]" : "text-zinc-500"
            }
          >
            {open ? "التسجيل مفتوح — اضغط للتسجيل" : "التسجيل مغلق"}
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--muted)]">
            <Users size={14} />
            {pending} بانتظار
          </span>
        </div>
      </Link>
      {staff ? (
        <div className="flex gap-2 border-t border-white/5 px-4 py-3">
          <Link
            href={`/tournaments/${tournament.id}/settings`}
            className="btn-gold !flex-1 !py-2 text-sm"
          >
            <Settings2 size={16} />
            إعدادات التسجيل
            {pending > 0 ? ` (${pending})` : ""}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
