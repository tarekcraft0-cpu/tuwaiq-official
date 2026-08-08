import { redirect } from "next/navigation";

/** واجهة طويق الرئيسية تُخدم من Express على /. منصة البطولات على /hub */
export default function PlatformIndexPage() {
  redirect("/hub");
}
