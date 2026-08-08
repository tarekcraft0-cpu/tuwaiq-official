"use client";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/context/StoreContext";
import { formatDateTime } from "@/lib/utils";

const categoryLabel = {
  announcement: "إعلان",
  results: "نتائج",
  rules: "قوانين",
  prize: "جوائز",
  schedule: "مواعيد",
} as const;

export default function NewsPage() {
  const { news } = useStore();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">NEWS</p>
        <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
          الأخبار والإعلانات
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          إعلانات البطولات، المواعيد، القوانين، والفائزين.
        </p>
      </div>

      {news.length === 0 ? (
        <EmptyState
          title="لا أخبار بعد"
          description="ستظهر هنا إعلانات الإدارة فور نشرها."
        />
      ) : (
        <div className="grid gap-4">
          {news.map((item) => (
            <article key={item.id} className="panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[var(--gold)]/30 text-[var(--gold-soft)]">
                  {categoryLabel[item.category]}
                </Badge>
                {item.pinned ? (
                  <Badge className="border-amber-400/40 text-amber-300">
                    مثبت
                  </Badge>
                ) : null}
                <span className="text-xs text-[var(--muted)]">
                  {formatDateTime(item.publishedAt)} · {item.author}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold sm:text-2xl">{item.title}</h2>
              <p className="mt-3 max-w-3xl leading-8 text-zinc-300">
                {item.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
