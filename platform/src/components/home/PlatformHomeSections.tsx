"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { PlayerCard } from "@/components/players/PlayerCard";
import { RegistrationBox } from "@/components/registration/RegistrationBox";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { useStore } from "@/context/StoreContext";
import { getLeaderboards } from "@/lib/data";
import { showsOnHome } from "@/lib/registration-placement";
import { formatDate } from "@/lib/utils";

/** أقسام البطولات داخل الصفحة الرئيسية الموحّدة (تحت واجهة طويق) */
export function PlatformHomeSections() {
  const { tournaments, news, votes, players, getPlayer, ready, user } =
    useStore();

  const homeBoxes = tournaments.filter((t) => showsOnHome(t));

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const h = window.location.hash.replace(/^#/, "");
    if (h === "arena") {
      document.getElementById("arena")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!h.startsWith("t-")) return;
    const el = document.getElementById(h);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ready, homeBoxes.length]);

  if (!ready) {
    return (
      <div
        id="arena"
        className="flex min-h-[30vh] items-center justify-center text-[var(--muted)]"
      >
        جاري تحميل البطولات...
      </div>
    );
  }

  const realTournaments = tournaments.filter((t) => !t.registrationOnly);
  const finished = realTournaments.filter((t) => t.status === "finished");
  const upcoming = realTournaments.filter((t) => t.status === "upcoming");
  const boards = getLeaderboards(players);
  const monthlyStar = boards.monthly[0];
  const latestResults = tournaments
    .flatMap((t) =>
      t.bracket
        .filter((m) => m.winnerId && m.score1 != null)
        .map((m) => ({ ...m, tournament: t })),
    )
    .slice(0, 5);
  const activeVote = votes.find((v) => v.active);

  return (
    <div id="arena" className="border-t border-[var(--line)]">
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 lg:px-6">
        <section className="text-center">
          <p className="text-xs tracking-[0.25em] text-[var(--gold)]">ARENA</p>
          <h2 className="section-title mt-2 text-3xl font-bold">بطولات طويق</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--muted)]">
            التسجيل والشجرة والترتيب والمتجر والتصويت — كلها هنا في نفس موقع طويق.
          </p>
        </section>

        {homeBoxes.length > 0 ? (
          <section className="space-y-4">
            <SectionHeader
              eyebrow="REGISTER"
              title="خانة التسجيل"
              description="سجّل يوزرك مباشرة هنا — فردي أو Duo حسب ما حدده المشرف."
              href="/join"
            />
            {homeBoxes.map((t) => (
              <RegistrationBox key={t.id} tournament={t} compact />
            ))}
          </section>
        ) : null}

        <section>
          <SectionHeader
            eyebrow="RESULTS"
            title="آخر النتائج"
            description="تظهر هنا نتائج المباريات بعد تسجيلها من الإدارة."
            href="/tournaments"
          />
          {latestResults.length === 0 ? (
            <EmptyState
              title="لا نتائج بعد"
              description="عند انطلاق أول بطولة وتسجيل النتائج ستظهر هنا مباشرة."
            />
          ) : (
            <div className="grid gap-3">
              {latestResults.map((match) => {
                const p1 = getPlayer(match.player1Id);
                const p2 = getPlayer(match.player2Id);
                return (
                  <Link
                    key={match.id}
                    href={`/tournaments/${match.tournament.id}`}
                    className="panel panel-hover flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs text-[var(--gold)]">
                        {match.tournament.name}
                      </p>
                      <p className="mt-1 font-semibold">
                        {p1?.username ?? "؟"}{" "}
                        <span className="text-[var(--muted)]">ضد</span>{" "}
                        {p2?.username ?? "؟"}
                      </p>
                    </div>
                    <div className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--gold-soft)]">
                      {match.score1} - {match.score2}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <SectionHeader
            eyebrow="TOP PLAYERS"
            title="أفضل اللاعبين"
            description="الترتيب يعتمد على النقاط بعد المشاركة والتأهل."
            href="/rankings"
          />
          {boards.points.length === 0 ? (
            <EmptyState
              title="الترتيب فارغ"
              description="سجّل كعضو وشارك في البطولات لتظهر هنا."
              actionHref="/register"
              actionLabel="إنشاء حساب"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {boards.points.slice(0, 4).map((player, i) => (
                <PlayerCard key={player.id} player={player} rank={i + 1} />
              ))}
            </div>
          )}
        </section>

        {monthlyStar ? (
          <section className="panel p-6">
            <p className="text-xs tracking-[0.2em] text-[var(--gold)]">
              PLAYER OF THE MONTH
            </p>
            <h2 className="section-title mt-2 text-2xl font-bold">
              أفضل لاعب هذا الشهر
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              يُحسب من مجموع نقاط الترتيب + الألقاب والإنجازات + الفوز — مو عشوائي.
            </p>
            <div className="mt-5 max-w-md">
              <PlayerCard player={monthlyStar} rank={1} />
            </div>
          </section>
        ) : null}

        <section className="panel p-6">
          <p className="text-xs tracking-[0.2em] text-[var(--gold)]">SHOP</p>
          <h2 className="section-title mt-2 text-2xl font-bold">متجر طويق</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            اجمع العملات من التأهل والبطولات، واشترِ إطارات وألقاب تظهر على حسابك.
          </p>
          <Link href="/shop" className="btn-gold mt-5">
            تصفح المتجر
          </Link>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <SectionHeader eyebrow="NEWS" title="آخر الأخبار" href="/news" />
            {news.length === 0 ? (
              <EmptyState
                title="لا أخبار بعد"
                description="الإدارة ستنشر الإعلانات والمواعيد من هنا."
              />
            ) : (
              <div className="space-y-3">
                {news.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href="/news"
                    className="panel panel-hover block p-4"
                  >
                    <div className="flex items-center gap-2">
                      {item.pinned ? (
                        <Badge className="border-[var(--gold)]/40 text-[var(--gold-soft)]">
                          مثبت
                        </Badge>
                      ) : null}
                      <span className="text-xs text-[var(--muted)]">
                        {formatDate(item.publishedAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                      {item.content}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader eyebrow="VOTE" title="التصويت الحالي" href="/votes" />
            {activeVote ? (
              <div className="panel p-5">
                <h3 className="text-lg font-bold">{activeVote.question}</h3>
                <div className="mt-5 space-y-3">
                  {activeVote.options.map((opt) => {
                    const pct = activeVote.totalVotes
                      ? Math.round((opt.votes / activeVote.totalVotes) * 100)
                      : 0;
                    return (
                      <div key={opt.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{opt.label}</span>
                          <span className="text-[var(--gold-soft)]">{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden bg-black/40">
                          <div
                            className="h-full bg-gradient-to-l from-[var(--gold)] to-[var(--gold-soft)] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                title="لا تصويت نشط"
                description="عند إنشاء تصويت من لوحة المشرفين سيظهر هنا."
              />
            )}
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="UPCOMING"
            title="البطولات القادمة"
            href="/tournaments"
          />
          {upcoming.length === 0 ? (
            <EmptyState
              title="لا بطولات قادمة"
              description="المشرفون سيضيفون الدوريات من لوحة الإدارة بأي حجم (16 أو 32 وغيرها)."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader
            eyebrow="ARCHIVE"
            title="البطولات المنتهية"
            href="/tournaments"
          />
          {finished.length === 0 ? (
            <EmptyState
              title="السجل فارغ"
              description="بعد انتهاء أول بطولة ستُحفظ هنا كتاريخ رسمي للقروب."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {finished.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </section>

        <section className="panel relative overflow-hidden p-8">
          <Image
            src="/logo.png"
            alt=""
            width={220}
            height={220}
            className="pointer-events-none absolute -left-8 -bottom-10 opacity-10"
          />
          <p className="text-xs tracking-[0.25em] text-[var(--gold)]">
            {user ? "YOUR PROFILE" : "START HERE"}
          </p>
          <h2 className="section-title mt-2 text-3xl font-bold">
            {user ? `أهلاً ${user.username}` : "حسابك في طويق"}
          </h2>
          <p className="mt-3 max-w-xl text-sm text-[var(--muted)]">
            {user
              ? "تابع إحصائياتك، غيّر أفاتارك، وكن جاهزاً للبطولات القادمة."
              : "سجّل بيوزر Plato من نفس الموقع، وكن جاهزاً لأول بطولة."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <Link href="/profile" className="btn-gold">
                ملفي الشخصي
              </Link>
            ) : (
              <Link href="/register" className="btn-gold">
                إنشاء حساب
              </Link>
            )}
            <Link href="/rules" className="btn-ghost">
              قراءة القوانين
            </Link>
            <Link href="/#members" className="btn-ghost">
              الأعضاء
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
