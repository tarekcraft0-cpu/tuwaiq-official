"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Countdown } from "@/components/ui/Countdown";
import { StatusBadge } from "@/components/ui/Badge";
import { useStore } from "@/context/StoreContext";
import { gameLabels } from "@/lib/data";
import type { Tournament } from "@/lib/types";

export function Hero({
  featured,
  nextTournament,
}: {
  featured?: Tournament;
  nextTournament?: Tournament;
}) {
  const { user } = useStore();

  return (
    <section className="relative overflow-hidden tuwaiq-grain">
      <div className="absolute inset-0">
        <Image
          src="/logo.png"
          alt="طويق"
          fill
          priority
          className="object-cover object-center opacity-[0.18] scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#1a100d] via-[#1a100d]/85 to-[#1a100d]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a100d] via-transparent to-[#1a100d]/60" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-6 lg:py-22">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-5 flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="طويق logo"
              width={88}
              height={88}
              className="float-soft h-20 w-20 rounded-full bg-white object-cover ring-2 ring-[var(--gold)]/50 sm:h-24 sm:w-24"
              priority
            />
            <div>
              <p className="text-xs font-semibold tracking-[0.35em] text-[var(--gold)]">
                OFFICIAL PLATFORM
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-wide gold-text sm:text-6xl lg:text-7xl">
                طويق
              </h1>
            </div>
          </div>

          <p className="max-w-xl text-base leading-8 text-zinc-300 sm:text-lg">
            المرجع الرسمي لبطولات قروب طويق في Plato — سجّل بيوزرك، انضم
            للبطولات، وتابع النتائج والإحصائيات.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {featured ? (
              <Link href={`/tournaments/${featured.id}`} className="btn-gold">
                متابعة البطولة الحالية
              </Link>
            ) : user ? (
              <Link href="/profile" className="btn-gold">
                ملفي الشخصي
              </Link>
            ) : (
              <Link href="/register" className="btn-gold">
                إنشاء حساب
              </Link>
            )}
            <Link href="/tournaments" className="btn-ghost">
              البطولات
            </Link>
          </div>

          {nextTournament ? (
            <div className="mt-10 max-w-md">
              <p className="mb-3 text-sm text-[var(--muted)]">
                العد التنازلي لـ {nextTournament.name}
              </p>
              <Countdown date={nextTournament.startDate} />
            </div>
          ) : (
            <div className="mt-10 max-w-md panel p-4 text-sm text-[var(--muted)]">
              لا توجد بطولة قادمة بعد — الإدارة ستعلن أول بطولة قريباً.
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className={`panel relative overflow-hidden p-5 ${featured ? "live-pulse" : ""}`}
        >
          {featured ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs tracking-[0.2em] text-[var(--gold)]">
                    البطولة الحالية
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{featured.name}</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {gameLabels[featured.game]} · دوري {featured.size} ·{" "}
                    {featured.participants.length} مشارك
                  </p>
                </div>
                <StatusBadge status={featured.status} />
              </div>
              <p className="text-sm leading-7 text-zinc-300">
                {featured.description}
              </p>
              <Link
                href={`/tournaments/${featured.id}`}
                className="mt-6 inline-flex text-sm font-semibold text-[var(--gold-soft)] transition hover:text-[var(--gold)]"
              >
                فتح الشجرة والنتائج ←
              </Link>
            </>
          ) : user ? (
            <>
              <p className="text-xs tracking-[0.2em] text-[var(--gold)]">
                مرحباً بك
              </p>
              <h2 dir="ltr" className="username-ltr mt-3 text-2xl font-bold">
                {user.username}
              </h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                حسابك جاهز — تابع البطولات، حدّث صورتك، وانتظر إعلان الإدارة.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/profile" className="btn-gold !py-2 text-sm">
                  ملفي وإحصائياتي
                </Link>
                <Link href="/tournaments" className="btn-ghost !py-2 text-sm">
                  البطولات
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs tracking-[0.2em] text-[var(--gold)]">
                طويق OFFICIAL
              </p>
              <h2 className="mt-3 text-2xl font-bold">ابدأ من هنا</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                سجّل حسابك بيوزر Plato، وانتظر إعلان أول بطولة من الإدارة.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/login" className="btn-ghost !py-2 text-sm">
                  دخول الأعضاء
                </Link>
                <Link href="/login?portal=admin" className="btn-ghost !py-2 text-sm">
                  دخول المشرفين
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
