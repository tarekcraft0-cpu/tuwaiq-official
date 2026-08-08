import Image from "next/image";
import Link from "next/link";

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-black/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 lg:px-6">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="طويق"
              width={44}
              height={44}
              className="h-11 w-11 rounded-full bg-white object-cover"
            />
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold gold-text">
                طويق
              </p>
              <p className="text-xs text-[var(--muted)]">بطولات قروب طويق</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]">
            المرجع الرسمي لبطولات Plato في قروب طويق — إحصائيات، إنجازات، تصويتات،
            وسجل تاريخي كامل بتجربة احترافية.
          </p>
          <a
            href="https://instagram.com/tuwaiq"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--gold-soft)] transition duration-300 hover:text-[var(--gold)]"
          >
            <InstagramIcon />
            @tuwaiq
          </a>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold">استكشف</p>
          <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
            <Link href="/" className="hover:text-[var(--gold-soft)]">
              الرئيسية
            </Link>
            <Link href="/#members" className="hover:text-[var(--gold-soft)]">
              الأعضاء
            </Link>
            <Link href="/#arena" className="hover:text-[var(--gold-soft)]">
              البطولات
            </Link>
            <Link href="/rankings" className="hover:text-[var(--gold-soft)]">
              أفضل 100 لاعب
            </Link>
            <Link href="/join" className="hover:text-[var(--gold-soft)]">
              تسجيل الأسامي
            </Link>
            <Link href="/votes" className="hover:text-[var(--gold-soft)]">
              التصويتات
            </Link>
            <Link href="/shop" className="hover:text-[var(--gold-soft)]">
              المتجر
            </Link>
            <Link href="/hall-of-fame" className="hover:text-[var(--gold-soft)]">
              Hall of Fame
            </Link>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold">المزيد</p>
          <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
            <Link href="/calendar" className="hover:text-[var(--gold-soft)]">
              تقويم المباريات
            </Link>
            <Link href="/rules" className="hover:text-[var(--gold-soft)]">
              قوانين البطولات
            </Link>
            <Link href="/prizes" className="hover:text-[var(--gold-soft)]">
              الجوائز والأوسمة
            </Link>
            <Link href="/h2h" className="hover:text-[var(--gold-soft)]">
              مواجهات مباشرة
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-[var(--muted)]">
        © {new Date().getFullYear()} طويق — بطولات قروب طويق. كل الحقوق محفوظة.
      </div>
    </footer>
  );
}
