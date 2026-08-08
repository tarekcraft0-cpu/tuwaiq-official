"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { RegistrationBox } from "@/components/registration/RegistrationBox";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/context/StoreContext";
import { showsOnJoin } from "@/lib/registration-placement";

export default function JoinPage() {
  const { tournaments, ready } = useStore();
  const [hashId, setHashId] = useState("");

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace(/^#/, "");
      setHashId(h.startsWith("t-") ? h.slice(2) : "");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const openList = useMemo(
    () => tournaments.filter((t) => showsOnJoin(t)),
    [tournaments],
  );

  useEffect(() => {
    if (!hashId || !openList.some((t) => t.id === hashId)) return;
    const el = document.getElementById(`t-${hashId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hashId, openList]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">JOIN</p>
        <h1 className="section-title mt-2 flex items-center gap-3 text-3xl font-bold sm:text-4xl">
          <ClipboardList className="text-[var(--gold)]" size={32} />
          تسجيل للبطولة القادمة
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          سجّل يوزرك للمشاركة في البطولة القادمة. في الفردي خانة واحدة، وفي
          الجماعي (Duo) تختار شريكك من قائمة أعضاء الموقع. يُرسل التسجيل إلى
          المشرفين أولاً.
        </p>
      </div>

      {openList.length === 0 ? (
        <EmptyState
          title="لا رابط تسجيل مفتوح"
          description="يُنشئ المشرف رابط تسجيل منفصلاً عن البطولة من لوحة المشرفين."
          actionHref="/"
          actionLabel="الرئيسية"
        />
      ) : (
        <div className="space-y-4">
          {openList.map((t) => (
            <RegistrationBox key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
