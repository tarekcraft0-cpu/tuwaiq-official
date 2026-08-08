"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { EmptyState } from "@/components/ui/EmptyState";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { ShareButton } from "@/components/ui/ShareButton";
import { useStore } from "@/context/StoreContext";
import { roleBadge, roleLabel } from "@/lib/roles";
import { getShopItem } from "@/lib/shop";
import { formatDate, rarityColor } from "@/lib/utils";

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const { players, user, updateProfile, tournaments } = useStore();
  const player = players.find((p) => p.id === params.id);
  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState("");

  if (!player) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="اللاعب غير موجود"
          description="تأكد من الرابط أو ابحث من صفحة اللاعبين."
          actionHref="/players"
          actionLabel="اللاعبون"
        />
      </div>
    );
  }

  const isOwner = user?.id === player.id;
  const played = tournaments.filter((t) => t.participants.includes(player.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="panel mb-8 overflow-hidden">
        <div className="h-24 bg-gradient-to-l from-[var(--gold)]/20 via-transparent to-white/5 sm:h-28" />
        <div className="px-4 pb-6 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <SafeAvatar
                src={player.avatar}
                alt={player.username}
                size={110}
                className="ring-4 ring-[#16161c]"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    dir="ltr"
                    className="username-ltr text-2xl font-bold sm:text-3xl"
                  >
                    {player.username}
                  </h1>
                  {roleBadge(player.role) ? (
                    <span className="rounded-full border border-[var(--gold)]/50 bg-[var(--gold-dim)] px-2.5 py-0.5 text-xs font-semibold text-[var(--gold-soft)]">
                      {roleBadge(player.role)}
                    </span>
                  ) : null}
                  {player.badges
                    .filter((b) => b !== "مشرف" && b !== "المالك")
                    .map((b) => (
                    <span
                      key={b}
                      className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold-dim)] px-2.5 py-0.5 text-xs text-[var(--gold-soft)]"
                    >
                      {b}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {roleLabel(player.role) !== "عضو"
                    ? roleLabel(player.role)
                    : player.rank}{" "}
                  · انضم {formatDate(player.joinedAt)} · {player.coins} 🪙
                </p>
                {player.equipped?.titleId ? (
                  <p className="mt-2 text-sm text-[var(--gold-soft)]">
                    {getShopItem(player.equipped.titleId)?.preview}{" "}
                    {getShopItem(player.equipped.titleId)?.name}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShareButton />
              {isOwner ? (
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  onClick={() => {
                    setAvatar(player.avatar);
                    setEditing((v) => !v);
                  }}
                >
                  {editing ? "إغلاق" : "تعديل الصورة"}
                </button>
              ) : null}
            </div>
          </div>

          {editing && isOwner ? (
            <div className="mt-5 space-y-3">
              <AvatarUpload
                value={avatar}
                onChange={(v) => {
                  setAvatar(v);
                  updateProfile({ avatar: v });
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "بطولات شارك فيها", value: player.tournamentsPlayed },
          { label: "بطولات فاز بها", value: player.tournamentsWon },
          { label: "نسبة الفوز", value: `${player.winRate}%` },
          { label: "نقاط الترتيب", value: player.stats.rankingPoints },
          { label: "العملات", value: player.coins },
          { label: "نقاط الشهر", value: player.monthlyScore ?? 0 },
          { label: "الانتصارات", value: player.wins },
          { label: "سلسلة الانتصارات", value: player.stats.winStreak },
        ].map((stat) => (
          <div key={stat.label} className="panel p-4">
            <p className="text-xs text-[var(--muted)]">{stat.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--gold-soft)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="section-title mb-4 text-2xl font-bold">الإحصائيات</h2>
          <div className="panel space-y-3 p-5">
            {[
              ["الأهداف", player.stats.goals],
              ["التمريرات الحاسمة", player.stats.assists],
              ["أكثر بطولة لعبها", player.stats.mostPlayedTournament ?? "—"],
              ["أكثر لاعب واجهه", player.stats.mostFacedOpponent ?? "—"],
              [
                "أفضل مركز",
                player.stats.bestPlacement
                  ? `#${player.stats.bestPlacement}`
                  : "—",
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0"
              >
                <span className="text-sm text-[var(--muted)]">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-title mb-4 text-2xl font-bold">الإنجازات</h2>
          {player.achievements.length === 0 ? (
            <EmptyState
              title="لا إنجازات بعد"
              description="تُضاف الأوسمة من لوحة المشرفين بعد البطولات."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
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
          )}
        </section>
      </div>

      <section className="mt-10">
        <h2 className="section-title mb-4 text-2xl font-bold">سجل المشاركات</h2>
        {played.length === 0 ? (
          <EmptyState
            title="لا مشاركات بعد"
            description="عند الانضمام لبطولة ستظهر هنا."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {played.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="panel panel-hover p-4"
              >
                <p className="font-bold">{t.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t.championId === player.id ? "بطل البطولة 🏆" : "مشارك"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
