"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const FALLBACK = "/logo.png";

function resolveAvatar(src?: string | null) {
  if (!src || typeof src !== "string") return FALLBACK;
  const v = src.trim();
  if (!v) return FALLBACK;
  if (
    v.startsWith("data:image/") ||
    v.startsWith("/") ||
    v.startsWith("http://") ||
    v.startsWith("https://")
  ) {
    return v;
  }
  return FALLBACK;
}

export function SafeAvatar({
  src,
  alt,
  size = 40,
  className,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  const resolved = resolveAvatar(src);
  const [shown, setShown] = useState(resolved);

  useEffect(() => {
    setShown(resolveAvatar(src));
  }, [src]);

  const sharedClass = cn(
    "block h-full w-full rounded-full object-cover object-center",
    className,
  );
  const onError = () => setShown(FALLBACK);

  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full bg-zinc-900"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {shown.startsWith("data:") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shown}
          alt={alt}
          width={size}
          height={size}
          className={sharedClass}
          onError={onError}
        />
      ) : (
        <Image
          src={shown || FALLBACK}
          alt={alt}
          width={size}
          height={size}
          unoptimized={shown.startsWith("/")}
          className={sharedClass}
          onError={onError}
        />
      )}
    </span>
  );
}
