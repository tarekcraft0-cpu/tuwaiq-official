"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/** توافق مع الروابط القديمة /r/... → /j/... */
export default function LegacyRegistrationRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!params.id) return;
    router.replace(`/j/${params.id}`);
  }, [params.id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
      <LoadingSpinner />
    </div>
  );
}
