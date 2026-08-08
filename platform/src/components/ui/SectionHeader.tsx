import Link from "next/link";

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "عرض الكل",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[var(--gold)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="section-title text-2xl font-bold sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="text-sm font-semibold text-[var(--gold-soft)] transition hover:text-[var(--gold)]"
        >
          {linkLabel} ←
        </Link>
      ) : null}
    </div>
  );
}
