"use client";

import { useEffect, useState } from "react";

function getParts(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export function Countdown({ date }: { date: string }) {
  const target = new Date(date);
  const [parts, setParts] = useState(() => getParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(getParts(target)), 1000);
    return () => clearInterval(id);
  }, [date]);

  const items = [
    { label: "يوم", value: parts.days },
    { label: "ساعة", value: parts.hours },
    { label: "دقيقة", value: parts.minutes },
    { label: "ثانية", value: parts.seconds },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="panel flex flex-col items-center justify-center px-2 py-3"
        >
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--gold-soft)] sm:text-3xl">
            {String(item.value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-xs text-[var(--muted)]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
