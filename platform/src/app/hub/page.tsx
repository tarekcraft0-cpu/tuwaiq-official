"use client";

import { useEffect } from "react";
import { Hero } from "@/components/home/Hero";
import { PlatformHomeSections } from "@/components/home/PlatformHomeSections";
import { useStore } from "@/context/StoreContext";

/** صفحة البطولات الكاملة مع كل المزايا + شريط الجوال السفلي */
export default function HubPage() {
  const { tournaments, ready } = useStore();

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const h = window.location.hash.replace(/^#/, "");
    if (!h.startsWith("t-")) return;
    document.getElementById(h)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ready, tournaments.length]);

  const realTournaments = tournaments.filter((t) => !t.registrationOnly);
  const featured =
    realTournaments.find((t) => t.status === "ongoing") ??
    realTournaments.find((t) => t.status === "upcoming");
  const nextTournament =
    realTournaments.find((t) => t.status === "upcoming") ?? featured;

  return (
    <div>
      {!ready ? (
        <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
          جاري التحميل...
        </div>
      ) : (
        <Hero featured={featured} nextTournament={nextTournament} />
      )}
      <PlatformHomeSections />
    </div>
  );
}
