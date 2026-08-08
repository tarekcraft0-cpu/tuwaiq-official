"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Settings2, Shuffle } from "lucide-react";
import { RegistrationBox } from "@/components/registration/RegistrationBox";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useStore } from "@/context/StoreContext";
import {
  findRegistrationByShareRef,
  isRegistrationOpen,
  registrationSharePath,
} from "@/lib/registration";
import { isStaff } from "@/lib/roles";
import { getTournamentFormat } from "@/lib/tournament-format";

/** صفحة تسجيل فقط — تُفتح من الرابط القصير المنسوخ */
export default function JoinRegistrationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    tournaments,
    players,
    user,
    ready,
    deleteRegistrationLink,
    createTournamentFromRegistration,
    updateRegistrationCapacity,
  } = useStore();
  const tournament = findRegistrationByShareRef(tournaments, params.id);
  const me = players.find((p) => p.id === user?.id);
  const staff = isStaff(me?.role ?? user?.role);
  const [capacityDraft, setCapacityDraft] = useState("");

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--muted)]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          title="رابط التسجيل غير موجود"
          description="تحقق من الرابط أو اطلب رابطاً جديداً من المشرف."
          actionHref="/"
          actionLabel="الرئيسية"
        />
      </div>
    );
  }

  const pending = tournament.pendingRegistrations ?? [];
  const format = getTournamentFormat(tournament);
  const registeredCount = pending.length + tournament.participants.length;
  const needed = tournament.size;
  const isFull = registeredCount >= needed;
  const overflow = Math.max(0, registeredCount - needed);
  const unit = format === "duo" ? "فريق" : "لاعب";
  const sharePath = registrationSharePath(tournament);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      <div className="mb-6 text-center">
        <Image
          src="/logo.png"
          alt="طويق"
          width={64}
          height={64}
          className="mx-auto h-16 w-16 rounded-full bg-white object-cover"
        />
        <p className="mt-4 text-xs tracking-[0.25em] text-[var(--gold)]">
          تسجيل البطولة
        </p>
        <h1 className="section-title mt-2 text-2xl font-bold sm:text-3xl">
          {tournament.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {format === "duo"
            ? "اختر يوزرك ثم شريك تيمك — تقدر تكتب يوزره حتى لو مو بالقائمة."
            : "ابحث عن يوزرك وسجّل مباشرة — بدون كلمة مرور."}
          {!isRegistrationOpen(tournament) ? " · التسجيل مغلق حالياً." : ""}
        </p>
      </div>

      <RegistrationBox tournament={tournament} compact hideStaffActions />

      {staff ? (
        <section className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-[var(--muted)]">
            للمشرفين فقط · {registeredCount}/{needed} {unit}
            {overflow > 0 ? ` · +${overflow} زيادة` : ""} · {sharePath}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs">
              <span className="mb-1 block text-[var(--muted)]">توسيع العدد</span>
              <input
                type="number"
                min={2}
                className="input-field w-24 !py-2 text-sm"
                placeholder={String(needed)}
                value={capacityDraft}
                onChange={(e) => setCapacityDraft(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-ghost !px-3 !py-2 text-sm"
              onClick={async () => {
                const next = Math.max(2, Number(capacityDraft) || needed + 8);
                const res = await updateRegistrationCapacity(
                  tournament.id,
                  next,
                );
                if (!res.ok) alert(res.error || "فشل");
                else setCapacityDraft("");
              }}
            >
              حفظ
            </button>
            <button
              type="button"
              className="btn-ghost !px-3 !py-2 text-sm"
              onClick={async () => {
                const next = Math.max(needed + 8, registeredCount);
                const res = await updateRegistrationCapacity(
                  tournament.id,
                  next,
                );
                if (!res.ok) alert(res.error || "فشل");
              }}
            >
              +8
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/tournaments/${tournament.id}/settings`}
              className="btn-ghost !px-3 !py-2 text-sm"
            >
              <Settings2 size={14} />
              الإعدادات
            </Link>
            {isFull ? (
              <button
                type="button"
                className="btn-gold !px-3 !py-2 text-sm"
                onClick={() => {
                  const res = createTournamentFromRegistration(tournament.id);
                  if (!res.ok) {
                    alert(res.error || "فشل");
                    return;
                  }
                  if (res.path || res.tournamentId) {
                    router.push(
                      res.path || `/tournaments/${res.tournamentId}`,
                    );
                  }
                }}
              >
                <Shuffle size={14} />
                إنشاء قرعة
                {overflow > 0 ? ` (${registeredCount})` : ""}
              </button>
            ) : null}
            <button
              type="button"
              className="btn-ghost !px-3 !py-2 text-sm text-red-300"
              onClick={async () => {
                if (
                  !confirm(
                    "هل تؤكد حذف رابط التسجيل؟\nسيُحذف الرابط وجميع المسجّلين فيه نهائياً.",
                  )
                ) {
                  return;
                }
                const res = await deleteRegistrationLink(tournament.id);
                if (!res.ok) {
                  alert(res.error || "فشل الحذف");
                  return;
                }
                router.push("/admin");
              }}
            >
              حذف الرابط
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
