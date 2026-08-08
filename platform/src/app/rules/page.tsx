import { rules } from "@/lib/data";

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-6">
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] text-[var(--gold)]">RULES</p>
        <h1 className="section-title mt-2 text-4xl font-bold">
          قوانين البطولات
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          القواعد الرسمية لمنافسات قروب طويق داخل Plato.
        </p>
      </div>

      <div className="space-y-5">
        {rules.map((section) => (
          <section key={section.title} className="panel p-5 sm:p-6">
            <h2 className="text-xl font-bold text-[var(--gold-soft)]">
              {section.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-7 text-zinc-300"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
