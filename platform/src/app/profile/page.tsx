"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Shield, UserRound } from "lucide-react";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { EmptyState } from "@/components/ui/EmptyState";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { useStore } from "@/context/StoreContext";
import { isStaff } from "@/lib/roles";
import { getShopItem } from "@/lib/shop";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { user, players, tournaments, updateProfile, logout } = useStore();
  const [avatar, setAvatar] = useState("");
  const [saved, setSaved] = useState(false);

  const player = players.find((p) => p.id === user?.id);

  useEffect(() => {
    if (player) setAvatar(player.avatar);
  }, [player]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="سجّل دخولك أولاً"
          description="عرض ملفك الشخصي وتعديل صورتك يحتاج حساب."
          actionHref="/login"
          actionLabel="تسجيل الدخول"
        />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="جاري تحميل الملف..."
          description="إذا استمرت المشكلة حدّث الصفحة."
        />
      </div>
    );
  }

  const played = tournaments.filter((t) => t.participants.includes(player.id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--gold)]">PROFILE</p>
          <h1 className="section-title mt-2 text-3xl font-bold">ملفي الشخصي</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            إحصائياتك وإعدادات حسابك
          </p>
        </div>
        <Link
          href={`/players/${player.id}`}
          className="btn-ghost !px-3 !py-2 text-sm"
        >
          <UserRound size={16} />
          الصفحة العامة
        </Link>
      </div>

      <section className="panel mb-6 overflow-hidden">
        <div className="h-20 bg-gradient-to-l from-[var(--gold)]/20 via-transparent to-white/5" />
        <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-end">
          <div className="-mt-10">
            <SafeAvatar
              src={player.avatar}
              alt={player.username}
              size={96}
              className="ring-4 ring-[#16161c]"
            />
          </div>
          <div className="flex-1">
            <h2 dir="ltr" className="username-ltr text-2xl font-bold">
              {player.username}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {player.rank} · انضم {formatDate(player.joinedAt)} · {player.coins}{" "}
              عملة
            </p>
            {player.equipped?.titleId ? (
              <p className="mt-2 text-sm text-[var(--gold-soft)]">
                {getShopItem(player.equipped.titleId)?.preview}{" "}
                {getShopItem(player.equipped.titleId)?.name}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section id="avatar" className="panel mb-6 space-y-4 p-5">
        <h3 className="text-lg font-bold">تغيير الأفاتار</h3>
        <p className="text-sm text-[var(--muted)]">
          ارفع صورة من جهازك — تظهر للقروب في الترتيب والبطولات.
        </p>
        <AvatarUpload
          value={avatar}
          onChange={(v) => {
            setAvatar(v);
            updateProfile({ avatar: v });
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2000);
          }}
        />
        {saved ? (
          <p className="text-sm text-[var(--success)]">تم حفظ الصورة</p>
        ) : null}
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        {[
          { label: "نقاط الترتيب", value: player.stats.rankingPoints },
          { label: "العملات", value: player.coins },
          { label: "بطولات شارك فيها", value: player.tournamentsPlayed },
          { label: "بطولات فاز بها", value: player.tournamentsWon },
          { label: "نسبة الفوز", value: `${player.winRate}%` },
          { label: "الانتصارات", value: player.wins },
          { label: "الخسائر", value: player.losses },
          { label: "سلسلة الانتصارات", value: player.stats.winStreak },
        ].map((stat) => (
          <div key={stat.label} className="panel p-4">
            <p className="text-xs text-[var(--muted)]">{stat.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--gold-soft)]">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="panel mb-6 p-5">
        <h3 className="mb-3 text-lg font-bold">آخر المشاركات</h3>
        {played.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            لا مشاركات بعد — انضم لأول بطولة من صفحة البطولات.
          </p>
        ) : (
          <div className="space-y-2">
            {played.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-sm transition hover:border-[var(--gold)]/30"
              >
                <span className="font-semibold">{t.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {t.championId === player.id ? "بطل 🏆" : "مشارك"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        {isStaff(user.role) ? (
          <Link href="/admin" className="btn-gold text-sm">
            <Shield size={16} />
            لوحة المشرفين
          </Link>
        ) : null}
        <button
          type="button"
          className="btn-ghost text-sm text-red-300"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
