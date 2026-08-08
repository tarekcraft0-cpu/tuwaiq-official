"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { fileToDataUrl } from "@/lib/utils";

export function AvatarUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function onFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("اختر صورة فقط");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("الصورة كبيرة جداً (الحد 8MB)");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
      setError("");
    } catch {
      setError("تعذر قراءة الصورة");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group flex w-full items-center gap-4 border border-dashed border-white/15 bg-black/20 p-4 text-start transition duration-300 hover:border-[var(--gold)]/45 hover:bg-[var(--gold-dim)]"
      >
        <div className="relative h-16 w-16 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/10">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--muted)]">
              <ImagePlus size={22} />
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">اختيار صورة من الاستوديو</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            ارفع صورة من جهازك — بدون روابط خارجية
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
