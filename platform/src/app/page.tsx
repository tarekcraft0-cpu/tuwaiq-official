import { redirect } from "next/navigation";

/** الاحتياط فقط — الرئيسية الحقيقية من Express على / */
export default function PlatformRootPage() {
  redirect("/tournaments");
}
