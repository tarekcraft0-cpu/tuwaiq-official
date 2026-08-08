"use client";

import { PlatformHomeSections } from "@/components/home/PlatformHomeSections";
import { TuwaiqEmbed } from "@/components/home/TuwaiqEmbed";

/** صفحة واحدةحدة: واجهة طويق + البطولات معاً */
export default function UnifiedHomePage() {
  return (
    <div className="-mt-2">
      <TuwaiqEmbed />
      <PlatformHomeSections />
    </div>
  );
}
