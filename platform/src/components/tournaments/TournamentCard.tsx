"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Settings2, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { useStore } from "@/context/StoreContext";
import { gameLabels } from "@/lib/data";
import {
  isRegistrationOpen,
  registrationStatusLabel,
  tournamentSharePath,
} from "@/lib/registration";
import { isStaff } from "@/lib/roles";
import { formatLabels, getTournamentFormat } from "@/lib/tournament-format";
import type { Tournament } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const { user, players } = useStore();
  const me = players.find((p) => p.id === user?.id);
  const staff = isStaff(me?.role ?? user?.role);
  const format = getTournamentFormat(tournament);
  const showSettings =
    staff &&
    (tournament.status === "ongoing" || tournament.status === "upcoming");
  const href = tournamentSharePath(tournament);

  return (
    <div className="panel panel-hover group relative overflow-hidden">
      <Link href={href} className="block">
        <div className="relative h-36 overflow-hidden bg-black sm:h-40">
          <Image
            src={tournament.image || "/logo.png"}
            alt={tournament.name}
            fill
            className="object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16161c] via-transparent to-transparent" />
          <div className="absolute right-3 top-3">
            <StatusBadge status={tournament.status} />
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <p className="text-xs text-[var(--gold)]">
              {gameLabels[tournament.game]} · {formatLabels[format]} ·{" "}
              {format === "duo" ? `${tournament.size} فرق` : `دوري ${tournament.size}`}
            </p>
            <h3 className="mt-1 text-lg font-bold leading-snug">
              {tournament.name}
            </h3>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} />
              {formatDate(tournament.startDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} />
              {tournament.participants.length}/{tournament.size}
            </span>
          </div>
          <p
            className={`text-xs ${
              isRegistrationOpen(tournament)
                ? "text-[var(--gold-soft)]"
                : "text-zinc-500"
            }`}
          >
            التسجيل: {registrationStatusLabel(tournament)}
            {staff && (tournament.pendingRegistrations?.length ?? 0) > 0
              ? ` · ${tournament.pendingRegistrations!.length} بانتظار الإضافة`
              : ""}
          </p>
        </div>
      </Link>

      {showSettings ? (
        <div className="border-t border-white/5 px-4 py-3">
          <Link
            href={`/tournaments/${tournament.id}/settings`}
            className="btn-gold !w-full !py-2 text-sm"
          >
            <Settings2 size={16} />
            إعدادات البطولة
            {(tournament.pendingRegistrations?.length ?? 0) > 0
              ? ` (${tournament.pendingRegistrations!.length})`
              : ""}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
