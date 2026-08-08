"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

export function ShareButton({
  label = "مشاركة الرابط",
  url,
  path,
}: {
  label?: string;
  /** رابط كامل للنسخ/المشاركة */
  url?: string;
  /** مسار قصير مثل /t/xxxx — يُضاف عليه أصل الموقع */
  path?: string;
}) {
  const [done, setDone] = useState(false);

  async function share() {
    const shareUrl =
      url ||
      (path && typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : "") ||
      (typeof window !== "undefined" ? window.location.href : "");
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: shareUrl });
        return;
      } catch {
        /* fall through */
      }
    }
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    }
  }

  return (
    <button type="button" onClick={share} className="btn-ghost !px-3 !py-2 text-sm">
      {done ? <Check size={16} /> : <Share2 size={16} />}
      {done ? "تم النسخ" : label}
    </button>
  );
}
