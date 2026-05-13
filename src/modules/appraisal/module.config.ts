import {
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  History,
  LayoutDashboard,
  Layers,
  ListChecks,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import type { ModuleConfig, WorkspaceNavItem } from "@/modules/_registry";
import { coreModule } from "@/modules/core/module.config";

const APPRAISAL_ROLES_REVIEWER: Role[] = ["HR", "TL", "MANAGER", "REVIEWER"];

function getAppraisalNav(
  role: Role,
  secondaryRole?: Role | null,
  homeHref?: string,
): WorkspaceNavItem[] {
  const personalNav = coreModule.getNav(role, secondaryRole);
  const home = homeHref ?? appraisalModule.defaultLandingPath(role, secondaryRole);
  const dashboard: WorkspaceNavItem = { href: home, label: "Dashboard", icon: LayoutDashboard };

  if (role === "ADMIN") {
    return [
      dashboard,
      { href: "/ams/admin/appraisals", label: "Appraisals", icon: UserCheck, group: "Appraisal" },
      { href: "/ams/admin/cycles", label: "All Cycles", icon: ClipboardList, group: "Appraisal" },
      { href: "/ams/admin/mom", label: "Minutes of Meeting", icon: Building2, group: "Appraisal" },
      { href: "/ams/admin/slabs", label: "Increment Slabs", icon: Layers, group: "Appraisal" },
      { href: "/ams/admin/extensions", label: "Extensions", icon: Calendar, group: "Appraisal" },
      { href: "/ams/admin/criteria", label: "Criteria Questions", icon: ListChecks, group: "Appraisal" },
      { href: "/ams/admin/kpi", label: "Department KPI", icon: BarChart3, group: "Appraisal" },
      { href: "/ams/admin/users", label: "User Management", icon: Users, group: "Appraisal" },
      { href: "/history", label: "History", icon: History, group: "Appraisal" },
      ...personalNav,
    ];
  }

  if (role === "MANAGEMENT") {
    return [
      dashboard,
      { href: "/ams/management/mom", label: "Minutes of Meeting", icon: Building2, group: "Appraisal" },
      { href: "/ams/management/salary", label: "Salary Calculator", icon: Wallet, group: "Appraisal" },
      { href: "/ams/management/slabs", label: "Increment Slabs", icon: Layers, group: "Appraisal" },
      { href: "/ams/management/arrears", label: "Arrear Approvals", icon: TrendingUp, group: "Appraisal" },
      { href: "/ams/management/kpi", label: "KPI Reports", icon: BarChart3, group: "Appraisal" },
      { href: "/history", label: "History", icon: History, group: "Appraisal" },
      ...personalNav,
    ];
  }

  if (APPRAISAL_ROLES_REVIEWER.includes(role)) {
    return [
      { href: "/ams/reviewer", label: "Dashboard", icon: LayoutDashboard },
      ...(role === "HR"
        ? [{ href: "/ams/reviewer/mom", label: "Minutes of Meeting", icon: Building2, group: "Appraisal" }]
        : []),
      { href: "/assignments", label: "All Assignments", icon: ClipboardList, group: "Appraisal" },
      ...(role === "TL"
        ? [{ href: "/ams/reviewer/kpi", label: "Team KPI", icon: BarChart3, group: "Appraisal" }]
        : []),
      { href: "/history", label: "Appraisal History", icon: History, group: "Appraisal" },
      ...personalNav,
    ];
  }

  if (role === "EMPLOYEE") {
    return [
      dashboard,
      { href: "/history", label: "History", icon: History, group: "Appraisal" },
      ...personalNav,
    ];
  }

  if (role === "PARTNER") {
    return [
      { href: "/ams/partner", label: "Dashboard", icon: LayoutDashboard },
      { href: "/hrms/employees", label: "Employees", icon: Users, group: "Partner" },
      { href: "/history", label: "History", icon: History, group: "Partner" },
      ...personalNav,
    ];
  }

  return [
    dashboard,
    { href: "/history", label: "History", icon: History, group: "Appraisal" },
    ...personalNav,
  ];
}

function canAccessAppraisal(role: Role, secondaryRole?: Role | null): boolean {
  // All roles can access the appraisal module
  return true;
}

function defaultAppraisalLanding(role: Role, _secondaryRole?: Role | null): string {
  switch (role) {
    case "ADMIN": return "/ams/admin";
    case "MANAGEMENT": return "/ams/management";
    case "MANAGER":
    case "HR":
    case "TL":
    case "REVIEWER": return "/ams/reviewer";
    case "PARTNER": return "/ams/partner";
    default: return "/ams/employee";
  }
}

export const appraisalModule: ModuleConfig = {
  key: "appraisal",
  moduleKey: "appraisal-management",
  label: "Appraisal Management",
  shortLabel: "Appraisal",
  description: "Cycles, reviews, ratings, salary revisions, and appraisal operations.",
  availability: "live",
  icon: Star,
  basePath: "/ams",
  accentClass: "bg-primary/10 text-primary",
  badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  pathPrefixes: [
    "/ams",
    "/workspace/ams",
  ],
  permissions: {
    "cycles.view": ["ADMIN", "MANAGEMENT", "PARTNER"],
    "cycles.create": ["ADMIN"],
    "cycles.manage": ["ADMIN"],
    "mom.view": ["ADMIN", "HR", "MANAGEMENT"],
    "mom.manage": ["ADMIN", "HR"],
    "slabs.view": ["ADMIN", "MANAGEMENT"],
    "slabs.manage": ["ADMIN"],
    "criteria.view": ["ADMIN"],
    "criteria.manage": ["ADMIN"],
    "appraisals.view": ["ADMIN"],
    "extensions.manage": ["ADMIN"],
    "kpi.department.view": ["ADMIN"],
    "kpi.department.manage": ["ADMIN"],
    "users.view": ["ADMIN"],
    "users.manage": ["ADMIN"],
    "arrears.view": ["ADMIN", "MANAGEMENT"],
    "arrears.manage": ["MANAGEMENT"],
    "salary.view": ["MANAGEMENT"],
    "reschedule.manage": ["ADMIN", "MANAGEMENT", "HR"],
    "rate.do": ["HR", "TL", "MANAGER", "REVIEWER"],
    "assignments.view": ["HR", "TL", "MANAGER", "REVIEWER"],
    "self-appraisal.do": ["EMPLOYEE", "HR", "TL", "MANAGER", "REVIEWER", "ADMIN"],
    "partner.view": ["PARTNER", "ADMIN"],
    "sessions.view": ["ADMIN"],
    "sessions.manage": ["ADMIN"],
    "passkeys.view": ["ADMIN"],
  },
  getNav: getAppraisalNav,
  canAccess: canAccessAppraisal,
  defaultLandingPath: defaultAppraisalLanding,
};
