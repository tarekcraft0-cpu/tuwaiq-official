import { redirect } from "next/navigation";

/** المنصة لم تعد منفصلة — كل شيء في الصفحة الرئيسية */
export default function HubRedirectPage() {
  redirect("/#arena");
}
