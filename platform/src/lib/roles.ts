import type { UserRole } from "@/lib/types";

export function isStaff(role?: UserRole | string | null) {
  return role === "admin" || role === "owner";
}

export function isOwner(role?: UserRole | string | null) {
  return role === "owner";
}

export function roleLabel(role?: UserRole | string | null) {
  if (role === "owner") return "المالك";
  if (role === "admin") return "مشرف";
  return "عضو";
}

export function roleBadge(role?: UserRole | string | null) {
  if (role === "owner") return "المالك";
  if (role === "admin") return "مشرف";
  return null;
}
