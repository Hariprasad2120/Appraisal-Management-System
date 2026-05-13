import {
  Activity,
  BookOpen,
  Calendar,
  Clock3,
  CreditCard,
  FileSpreadsheet,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import type { ModuleConfig, WorkspaceNavItem } from "@/modules/_registry";
import { coreModule } from "@/modules/core/module.config";

function getAttendanceNav(role: Role, secondaryRole?: Role | null): WorkspaceNavItem[] {
  const personal = coreModule.getNav(role, secondaryRole);

  if (role === "ADMIN") {
    return [
      { href: "/attendance", label: "Dashboard", icon: LayoutDashboard },
      { href: "/attendance/logs", label: "Attendance Logs", icon: Activity, group: "Attendance" },
      { href: "/attendance/import", label: "Attendance Import", icon: Activity, group: "Attendance" },
      { href: "/attendance/overtime", label: "Overtime", icon: Clock3, group: "Attendance" },
      { href: "/attendance/lod", label: "LOD Manager", icon: Layers, group: "Attendance" },
      { href: "/attendance/holidays", label: "Holiday Manager", icon: Calendar, group: "Attendance" },
      { href: "/attendance/shift", label: "Shift Manager", icon: CreditCard, group: "Attendance" },
      { href: "/attendance/leave-tracker", label: "Leave Tracker", icon: BookOpen, group: "Attendance" },
      { href: "/attendance/payroll", label: "Final Payroll", icon: FileSpreadsheet, group: "Attendance" },
      { href: "/attendance/settings", label: "OT Settings", icon: ShieldCheck, group: "Attendance" },
      ...personal,
    ];
  }

  if (role === "HR" || secondaryRole === "HR") {
    return [
      { href: "/attendance", label: "Dashboard", icon: LayoutDashboard },
      { href: "/attendance/approvals", label: "Team Approvals", icon: Users, group: "Attendance" },
      { href: "/attendance/mine", label: "My OT", icon: Clock3, group: "Attendance" },
      ...personal,
    ];
  }

  if (
    ["TL", "MANAGER", "REVIEWER"].includes(role) ||
    ["TL", "MANAGER", "REVIEWER"].includes(secondaryRole ?? "")
  ) {
    return [
      { href: "/attendance/approvals", label: "Team Approvals", icon: Users, group: "Attendance" },
      { href: "/attendance/mine", label: "My OT", icon: Clock3, group: "Attendance" },
      ...personal,
    ];
  }

  return [
    { href: "/attendance/mine", label: "My OT", icon: Clock3, group: "Attendance" },
    ...personal,
  ];
}

function canAccessAttendance(role: Role, secondaryRole?: Role | null): boolean {
  return (
    role === "ADMIN" ||
    role === "HR" ||
    secondaryRole === "HR" ||
    ["TL", "MANAGER", "REVIEWER", "EMPLOYEE"].includes(role) ||
    ["TL", "MANAGER", "REVIEWER"].includes(secondaryRole ?? "")
  );
}

function defaultAttendanceLanding(role: Role, secondaryRole?: Role | null): string {
  if (role === "ADMIN" || role === "HR" || secondaryRole === "HR") return "/attendance";
  if (
    ["TL", "MANAGER", "REVIEWER"].includes(role) ||
    ["TL", "MANAGER", "REVIEWER"].includes(secondaryRole ?? "")
  ) {
    return "/attendance/approvals";
  }
  return "/attendance/mine";
}

export const attendanceModule: ModuleConfig = {
  key: "attendance",
  moduleKey: "attendance-management",
  label: "Attendance Management",
  shortLabel: "Attendance",
  description: "Attendance import, OT approvals, holidays, LOP tracking, and payroll attendance inputs.",
  availability: "live",
  icon: Clock3,
  basePath: "/attendance",
  accentClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  pathPrefixes: ["/admin/ot", "/reviewer/ot", "/employee/ot", "/api/ot", "/attendance"],
  permissions: {
    "dashboard.view": ["ADMIN", "HR"],
    "logs.view": ["ADMIN"],
    "import.manage": ["ADMIN"],
    "overtime.manage": ["ADMIN"],
    "lod.manage": ["ADMIN"],
    "holidays.manage": ["ADMIN"],
    "shift.manage": ["ADMIN"],
    "leave-tracker.view": ["ADMIN"],
    "payroll.view": ["ADMIN"],
    "settings.manage": ["ADMIN"],
    "approvals.view": ["HR", "TL", "MANAGER", "REVIEWER"],
    "mine.view": ["EMPLOYEE", "HR", "TL", "MANAGER", "REVIEWER", "ADMIN"],
  },
  getNav: getAttendanceNav,
  canAccess: canAccessAttendance,
  defaultLandingPath: defaultAttendanceLanding,
};
