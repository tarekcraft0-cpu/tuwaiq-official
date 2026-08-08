"use client";

import { useCallback, useEffect, useState } from "react";

type GroupOpinion = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

type MemberOpinion = GroupOpinion & {
  memberId: string;
  memberName: string;
  memberUsername: string;
  verdict?: "true" | "false";
};

export function SiteOpinionsPanel({
  onNotify,
}: {
  onNotify: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [groupOpinions, setGroupOpinions] = useState<GroupOpinion[]>([]);
  const [memberOpinions, setMemberOpinions] = useState<MemberOpinion[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/site/opinions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        onNotify(data.error || "تعذر تحميل الآراء");
        return;
      }
      setGroupOpinions(data.groupOpinions || []);
      setMemberOpinions(data.memberOpinions || []);
    } catch {
      onNotify("تعذر الاتصال لجلب الآراء");
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteGroup(id: string) {
    if (!confirm("تحذف رأي القروب هذا؟")) return;
    const res = await fetch(`/api/site/group-opinions/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      onNotify(data.error || "فشل الحذف");
      return;
    }
    onNotify("تم حذف رأي القروب");
    void load();
  }

  async function deleteMember(memberId: string, opinionId: string) {
    if (!confirm("تحذف رأي العضو هذا؟")) return;
    const res = await fetch(
      `/api/site/members/${memberId}/opinions/${opinionId}`,
      { method: "DELETE" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      onNotify(data.error || "فشل الحذف");
      return;
    }
    onNotify("تم حذف رأي العضو");
    void load();
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">جاري تحميل الآراء...</p>;
  }

  return (
    <div className="space-y-8">
      <section className="panel p-5">
        <h2 className="text-xl font-bold">آراء القروب</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          احذف أي رأي عام عن طويق من هنا.
        </p>
        <div className="mt-4 space-y-3">
          {groupOpinions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">لا توجد آراء عن القروب.</p>
          ) : (
            groupOpinions.map((op) => (
              <article
                key={op.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{op.author || "زائر"}</p>
                  <p className="mt-1 text-sm text-zinc-300">{op.text}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {new Date(op.createdAt).toLocaleString("ar-SA")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0 !py-2 text-sm text-[var(--danger)]"
                  onClick={() => void deleteGroup(op.id)}
                >
                  حذف
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-xl font-bold">آراء عن الأعضاء / الأدمنية</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          احذف أي رأي مكتوب تحت عضو من هنا.
        </p>
        <div className="mt-4 space-y-3">
          {memberOpinions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">لا توجد آراء عن الأعضاء.</p>
          ) : (
            memberOpinions.map((op) => (
              <article
                key={`${op.memberId}-${op.id}`}
                className="flex flex-col gap-3 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">
                    عن: {op.memberName}{" "}
                    <span className="text-[var(--muted)]">@{op.memberUsername}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--gold-soft)]">
                    {op.verdict === "false" ? "غير حقيقي" : op.verdict === "true" ? "حقيقي" : ""}
                    {op.author ? ` · بواسطة ${op.author}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">{op.text}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {new Date(op.createdAt).toLocaleString("ar-SA")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0 !py-2 text-sm text-[var(--danger)]"
                  onClick={() => void deleteMember(op.memberId, op.id)}
                >
                  حذف
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
