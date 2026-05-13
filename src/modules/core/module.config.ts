import {
  Activity,
  Bell,
  BarChart3,
  Calendar,
  ClipboardList,
  Clock3,
  FileText,
  History,
  LayoutDashboard,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import type { ModuleConfig, WorkspaceNavItem } from "@/modules/_registry";

function getCoreNav(): WorkspaceNavItem[] {
  return [
    { href: "/notifications", label: "Notifications", icon: Bell, group: "Personal" },
    { href: "/tickets", label: "Support Tickets", icon: Ticket, group: "Personal" },
    { href: "/my-appraisal", label: "My Appraisal", icon: Star, group: "Personal" },
    { href: "/tasks", label: "Tasks", icon: ClipboardList, group: "Personal" },
    { href: "/kpi", label: "KPI", icon: BarChart3, group: "Personal" },
    { href: "/work-reports", label: "Work Reports", icon: FileText, group: "Personal" },
    { href: "/leave", label: "Leave", icon: Calendar, group: "Personal" },
    { href: "/attendance", label: "Attendance", icon: Clock3, group: "Personal" },
    { href: "/team", label: "Team", icon: Users, group: "Personal" },
    { href: "/history", label: "History", icon: History, group: "Personal" },
    { href: "/assignments", label: "Assignments", icon: Activity, group: "Personal" },
  ];
}

export const coreModule: ModuleConfig = {
  key: "core",
  label: "Core",
  shortLabel: "Core",
  description: "Personal pages, notifications, tickets, tasks, and shared utilities.",
  availability: "live",
  icon: LayoutDashboard,
  alwaysOn: true,
  basePath: "/",
  accentClass: "bg-muted text-muted-foreground",
  badgeClass: "bg-muted text-muted-foreground",
  pathPrefixes: [
    "/notifications",
    "/tickets",
    "/my-appraisal",
    "/tasks",
    "/kpi",
    "/work-reports",
    "/leave",
    "/attendance",
    "/team",
    "/history",
    "/assignments",
  ],
  permissions: {},
  getNav: () => getCoreNav(),
  canAccess: () => true,
  defaultLandingPath: () => "/",
};
