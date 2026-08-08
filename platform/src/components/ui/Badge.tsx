import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-200",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: "upcoming" | "ongoing" | "finished" | "pending" | "live";
}) {
  const map = {
    upcoming: {
      label: "قادمة",
      className: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    },
    ongoing: {
      label: "جارية",
      className: "border-amber-400/40 bg-amber-500/10 text-amber-300",
    },
    finished: {
      label: "منتهية",
      className: "border-zinc-400/30 bg-zinc-500/10 text-zinc-300",
    },
    pending: {
      label: "لم تبدأ",
      className: "border-zinc-400/30 bg-zinc-500/10 text-zinc-300",
    },
    live: {
      label: "جارية",
      className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    },
  } as const;

  const item = map[status];
  return <Badge className={item.className}>{item.label}</Badge>;
}
