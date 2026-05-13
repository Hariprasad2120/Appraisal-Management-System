import type { Role } from "@/generated/prisma/enums";
import {
  APPRAISAL_MODULE_KEY as APPRAISAL_WORKSPACE_KEY,
  getModuleRequiredForPath,
} from "@/lib/workspace-navigation";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  MANAGEMENT: "/management",
  MANAGER: "/reviewer",
  HR: "/reviewer",
  TL: "/reviewer",
  REVIEWER: "/reviewer",
  EMPLOYEE: "/employee",
  PARTNER: "/partner",
};

export const REVIEWER_ROLES: Role[] = ["HR", "TL", "MANAGER", "REVIEWER"];
export const APPRAISAL_MODULE_KEY = APPRAISAL_WORKSPACE_KEY;

const APPRAISAL_PATH_PREFIXES = [
  "/admin",
  "/management",
  "/reviewer",
  "/employee",
  "/assignments",
  "/history",
  "/tickets",
  "/partner",
  "/notifications",
  "/api/cron/process-deadlines",
  "/api/notifications",
  "/api/ot",
];

const ATTENDANCE_ADMIN_PREFIXES = [
  "/attendance/logs",
  "/attendance/import",
  "/attendance/overtime",
  "/attendance/lod",
  "/attendance/lop",
  "/attendance/holidays",
  "/attendance/shift",
  "/attendance/leave-tracker",
  "/attendance/records",
  "/attendance/payroll",
  "/attendance/settings",
];

const ATTENDANCE_REVIEWER_PREFIXES = ["/attendance/approvals"];

export function isAppraisalModulePath(pathname: string): boolean {
  if (pathname.startsWith("/admin/ot") || pathname.startsWith("/reviewer/ot") || pathname.startsWith("/employee/ot") || pathname.startsWith("/api/ot") || pathname.startsWith("/attendance")) {
    return false;
  }
  return APPRAISAL_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function isAppraisalModuleEnabled(enabledModules?: string[] | null): boolean {
  return enabledModules?.includes(APPRAISAL_MODULE_KEY) ?? true;
}

export function isModuleEnabledForPath(pathname: string, enabledModules?: string[] | null) {
  const requiredModule = getModuleRequiredForPath(pathname);
  if (!requiredModule) return true;
  return enabledModules?.includes(requiredModule) ?? false;
}

/** Roles that can receive an appraisal cycle. MANAGEMENT and PARTNER are excluded. */
export const NON_APPRAISABLE_ROLES: Role[] = ["MANAGEMENT", "PARTNER"];

export function canBeAppraised(role: Role): boolean {
  return !NON_APPRAISABLE_ROLES.includes(role);
}

export function isReviewer(role: Role): boolean {
  return REVIEWER_ROLES.includes(role);
}

export function hasRole(
  role: Role,
  secondaryRole: Role | null | undefined,
  target: Role,
): boolean {
  return role === target || secondaryRole === target;
}

export function isAdmin(role: Role, secondaryRole?: Role | null): boolean {
  return role === "ADMIN" || secondaryRole === "ADMIN";
}

export function isManagement(role: Role, secondaryRole?: Role | null): boolean {
  return role === "MANAGEMENT" || isAdmin(role, secondaryRole);
}

function hrmsCanAccess(role: Role, secondaryRole?: Role | null): boolean {
  return (
    role === "ADMIN" ||
    role === "HR" ||
    role === "MANAGEMENT" ||
    role === "PARTNER" ||
    secondaryRole === "HR"
  );
}

export function canAccessPath(
  role: Role,
  pathname: string,
  secondaryRole?: Role | null,
  enabledModules?: string[] | null,
): boolean {
  if (!isModuleEnabledForPath(pathname, enabledModules)) {
    return false;
  }
  // HRMS module paths
  if (
    (pathname.startsWith("/hrms/employees/") || pathname.startsWith("/workspace/hrms/employees/")) &&
    pathname.includes("/assign")
  ) {
    return isAdmin(role, secondaryRole);
  }
  if (pathname.startsWith("/hrms/employees") || pathname.startsWith("/workspace/hrms/employees"))
    return (
      isAdmin(role, secondaryRole) ||
      role === "MANAGEMENT" ||
      role === "PARTNER"
    );
  if (pathname.startsWith("/hrms")) return hrmsCanAccess(role, secondaryRole);
  if (pathname.startsWith("/workspace/hrms")) return hrmsCanAccess(role, secondaryRole);
  if (pathname.startsWith("/admin/cycles/"))
    return (
      isAdmin(role, secondaryRole) ||
      role === "MANAGEMENT" ||
      role === "PARTNER"
    );
  if (pathname.startsWith("/admin/mom")) return isAdmin(role, secondaryRole);
  if (pathname.startsWith("/admin/sessions"))
    return isAdmin(role, secondaryRole);
  if (pathname.startsWith("/admin/ot"))
    return (
      isAdmin(role, secondaryRole) ||
      role === "HR" ||
      secondaryRole === "HR"
    );
  if (pathname.startsWith("/admin")) return isAdmin(role, secondaryRole);
  if (pathname.startsWith("/management/slabs"))
    return role === "MANAGEMENT" || secondaryRole === "MANAGEMENT";
  if (pathname.startsWith("/management/mom"))
    return role === "MANAGEMENT" || secondaryRole === "MANAGEMENT";
  if (pathname.startsWith("/management/arrears"))
    return isManagement(role, secondaryRole);
  if (pathname.startsWith("/management/reschedule"))
    return (
      isManagement(role, secondaryRole) ||
      role === "HR" ||
      secondaryRole === "HR"
    );
  if (pathname.startsWith("/management"))
    return role === "MANAGEMENT" || secondaryRole === "MANAGEMENT";
  if (pathname.startsWith("/admin/arrears"))
    return isAdmin(role, secondaryRole);
  if (pathname.startsWith("/reviewer/mom"))
    return role === "HR" || secondaryRole === "HR";
  if (pathname.startsWith("/reviewer"))
    return (
      isReviewer(role) ||
      secondaryRole === "HR" ||
      secondaryRole === "TL" ||
      secondaryRole === "MANAGER"
    );
  if (pathname.startsWith("/assignments"))
    return (
      isReviewer(role) ||
      secondaryRole === "HR" ||
      secondaryRole === "TL" ||
      secondaryRole === "MANAGER"
    );
  if (pathname.startsWith("/employee")) return canBeAppraised(role);
  if (pathname.startsWith("/partner"))
    return role === "PARTNER" || isAdmin(role, secondaryRole);
  // Attendance module — new /attendance/* paths
  if (ATTENDANCE_ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return isAdmin(role, secondaryRole) || role === "HR" || secondaryRole === "HR";
  }
  if (ATTENDANCE_REVIEWER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return (
      isReviewer(role) ||
      secondaryRole === "HR" ||
      secondaryRole === "TL" ||
      secondaryRole === "MANAGER"
    );
  }
  if (pathname.startsWith("/attendance")) return true; // /attendance/mine — all authenticated users
  if (pathname.startsWith("/history")) return true;
  if (pathname.startsWith("/tickets")) return true;
  return true;
}

export function assertRole(
  actual: Role,
  allowed: Role[],
  secondary?: Role | null,
): void {
  if (
    !allowed.includes(actual) &&
    !(secondary && allowed.includes(secondary))
  ) {
    throw new Error(`Forbidden: role ${actual} not in [${allowed.join(",")}]`);
  }
}
