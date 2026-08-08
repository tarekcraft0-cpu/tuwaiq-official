"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { useStore } from "@/context/StoreContext";
import { rarityColor } from "@/lib/utils";

export default function PrizesPage() {
  const { players } = useStore();
  const awarded = players.filter((p) => p.achievements.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">PRIZES</p>
        <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
          الجوائز والأوسمة
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          كل الإنجازات الحقيقية التي يمنحها المشرفون بعد البطولات.
        </p>
      </div>

      {awarded.length === 0 ? (
        <EmptyState
          title="لا جوائز بعد"
          description="الأوسمة تُضاف من لوحة المشرفين وتظهر هنا وفي الملف الشخصي."
        />
      ) : (
        <div className="space-y-8">
          {awarded.map((player) => (
            <section key={player.id} className="panel p-5">
              <Link
                href={`/players/${player.id}`}
                className="mb-4 flex items-center gap-3"
              >
                <SafeAvatar
                  src={player.avatar}
                  alt={player.username}
                  size={48}
                />
                <div>
                  <p className="font-bold">{player.username}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {player.achievements.length} إنجاز
                  </p>
                </div>
              </Link>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {player.achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`border p-4 ${rarityColor(ach.rarity)}`}
                  >
                    <div className="text-2xl">{ach.icon}</div>
                    <p className="mt-2 font-bold">{ach.title}</p>
                    <p className="mt-1 text-xs opacity-80">{ach.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
