import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export function formatDateTime(date: string) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export function rarityColor(rarity: string) {
  switch (rarity) {
    case "legendary":
      return "border-amber-400/60 bg-amber-500/10 text-amber-300";
    case "epic":
      return "border-violet-400/50 bg-violet-500/10 text-violet-300";
    case "rare":
      return "border-sky-400/50 bg-sky-500/10 text-sky-300";
    default:
      return "border-white/15 bg-white/5 text-zinc-300";
  }
}

export async function fileToDataUrl(file: File, maxSize = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  // ضغط أقوى عشان الأفتار يتحمل مع السيرفر ويعرض بثبات
  return canvas.toDataURL("image/jpeg", 0.62);
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
