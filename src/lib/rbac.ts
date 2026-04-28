import type { Role } from "@/generated/prisma/enums";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  MANAGEMENT: "/management",
  MANAGER: "/reviewer",
  HR: "/reviewer",
  TL: "/reviewer",
  EMPLOYEE: "/employee",
  PARTNER: "/partner",
};

export const REVIEWER_ROLES: Role[] = ["HR", "TL", "MANAGER"];

/** Roles that can receive an appraisal cycle. MANAGEMENT and PARTNER are excluded. */
export const NON_APPRAISABLE_ROLES: Role[] = ["MANAGEMENT", "PARTNER"];

export function canBeAppraised(role: Role): boolean {
  return !NON_APPRAISABLE_ROLES.includes(role);
}

export function isReviewer(role: Role): boolean {
  return REVIEWER_ROLES.includes(role);
}

export function hasRole(role: Role, secondaryRole: Role | null | undefined, target: Role): boolean {
  return role === target || secondaryRole === target;
}

export function isAdmin(role: Role, secondaryRole?: Role | null): boolean {
  return role === "ADMIN" || secondaryRole === "ADMIN";
}

export function isManagement(role: Role, secondaryRole?: Role | null): boolean {
  return role === "MANAGEMENT" || isAdmin(role, secondaryRole);
}

export function canAccessPath(role: Role, pathname: string, secondaryRole?: Role | null): boolean {
  // Management and partners may view employee pages (read-only server actions enforce roles)
  if (pathname.startsWith("/admin/employees/") && pathname.includes("/assign")) {
    return isAdmin(role, secondaryRole);
  }
  if (pathname.startsWith("/admin/employees")) return isAdmin(role, secondaryRole) || role === "MANAGEMENT" || role === "PARTNER";
  if (pathname.startsWith("/admin/cycles/")) return isAdmin(role, secondaryRole) || role === "MANAGEMENT" || role === "PARTNER";
  if (pathname.startsWith("/admin/mom/")) return isAdmin(role, secondaryRole) || role === "MANAGEMENT" || role === "HR" || secondaryRole === "HR";
  if (pathname.startsWith("/admin")) return isAdmin(role, secondaryRole);
  if (pathname.startsWith("/management/slabs")) return isManagement(role, secondaryRole);
  if (pathname.startsWith("/management")) return isManagement(role, secondaryRole);
  if (pathname.startsWith("/reviewer")) return isReviewer(role) || isAdmin(role, secondaryRole) || secondaryRole === "HR" || secondaryRole === "TL" || secondaryRole === "MANAGER";
  if (pathname.startsWith("/employee")) return canBeAppraised(role);
  if (pathname.startsWith("/partner")) return role === "PARTNER" || isAdmin(role, secondaryRole);
  if (pathname.startsWith("/history")) return true;
  if (pathname.startsWith("/tickets")) return true;
  return true;
}

export function assertRole(actual: Role, allowed: Role[], secondary?: Role | null): void {
  if (!allowed.includes(actual) && !(secondary && allowed.includes(secondary))) {
    throw new Error(`Forbidden: role ${actual} not in [${allowed.join(",")}]`);
  }
}
