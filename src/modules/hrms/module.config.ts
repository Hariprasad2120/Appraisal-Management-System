import {
  BookOpen,
  Building2,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Megaphone,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import type { ModuleConfig, WorkspaceNavItem } from "@/modules/_registry";
import { coreModule } from "@/modules/core/module.config";

function getHrmsNav(role: Role, secondaryRole?: Role | null): WorkspaceNavItem[] {
  return [
    { href: "/hrms", label: "Dashboard", icon: LayoutDashboard },
    { href: "/hrms/employees", label: "Employees", icon: Users, group: "HRMS" },
    { href: "/hrms/ownership", label: "Ownership", icon: UserCheck, group: "HRMS" },
    { href: "/hrms/salary", label: "Salary", icon: Wallet, group: "HRMS" },
    { href: "/hrms/documents", label: "Documents", icon: FileText, group: "HRMS" },
    { href: "/hrms/payroll", label: "Payroll", icon: FileSpreadsheet, group: "HRMS" },
    { href: "/hrms/policies", label: "Policies", icon: BookOpen, group: "HRMS" },
    { href: "/hrms/tracking", label: "Tracking", icon: TrendingUp, group: "HRMS" },
    { href: "/hrms/announcements", label: "Announcements", icon: Megaphone, group: "HRMS" },
    ...coreModule.getNav(role, secondaryRole),
  ];
}

function canAccessHrms(role: Role, secondaryRole?: Role | null): boolean {
  return (
    role === "ADMIN" ||
    role === "HR" ||
    role === "MANAGEMENT" ||
    role === "PARTNER" ||
    secondaryRole === "HR"
  );
}

export const hrmsModule: ModuleConfig = {
  key: "hrms",
  moduleKey: "human-resource-management",
  label: "Human Resource Management",
  shortLabel: "HRM",
  description: "Core people operations, organization records, and broader HR workflows.",
  availability: "live",
  icon: Building2,
  basePath: "/hrms",
  accentClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  pathPrefixes: ["/workspace/hrms", "/hrms"],
  permissions: {
    "employees.view": ["ADMIN", "HR", "MANAGEMENT", "PARTNER"],
    "employees.manage": ["ADMIN", "HR"],
    "employees.assign": ["ADMIN"],
    "ownership.view": ["ADMIN", "HR"],
    "salary.view": ["ADMIN", "HR"],
    "documents.view": ["ADMIN", "HR"],
    "payroll.view": ["ADMIN", "HR"],
    "policies.view": ["ADMIN", "HR"],
    "tracking.view": ["ADMIN", "HR"],
    "announcements.view": ["ADMIN", "HR"],
    "announcements.manage": ["ADMIN", "HR"],
  },
  getNav: getHrmsNav,
  canAccess: canAccessHrms,
  defaultLandingPath: () => "/hrms",
};
