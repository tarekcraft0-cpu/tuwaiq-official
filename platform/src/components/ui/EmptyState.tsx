import Link from "next/link";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--gold)]/25 bg-[var(--gold-dim)] text-[var(--gold-soft)]">
        <Inbox size={24} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn-gold mt-6">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
