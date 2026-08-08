import type { RegistrationPlacement, Tournament } from "@/lib/types";
import { isRegistrationOpen } from "@/lib/registration";

export const placementLabels: Record<RegistrationPlacement, string> = {
  home: "الرئيسية فقط",
  join: "صفحة التسجيل فقط",
  both: "الرئيسية + صفحة التسجيل",
};

export function getRegistrationPlacement(
  t: Tournament,
): RegistrationPlacement {
  if (t.registrationPlacement === "home" || t.registrationPlacement === "join") {
    return t.registrationPlacement;
  }
  // الخانات المخصصة تظهر في الرئيسية افتراضياً؛ تسجيل البطولة في /join
  if (t.registrationOnly) return "both";
  return "join";
}

export function showsOnHome(t: Tournament) {
  if (!isRegistrationOpen(t)) return false;
  const place = getRegistrationPlacement(t);
  return place === "home" || place === "both";
}

export function showsOnJoin(t: Tournament) {
  if (!isRegistrationOpen(t)) return false;
  const place = getRegistrationPlacement(t);
  return place === "join" || place === "both";
}
