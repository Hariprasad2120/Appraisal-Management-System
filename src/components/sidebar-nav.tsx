"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ROLE_HOME } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/enums";
import {
  LayoutDashboard,
  Users,
  History,
  Star,
  UserCheck,
  BarChart3,
  ClipboardList,
  Layers,
  Settings,
  Building2,
  TrendingUp,
  ListChecks,
  Ticket,
  FlaskConical,
  Bell,
  MonitorCheck,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function navFor(role: Role, secondaryRole?: Role | null): NavItem[] {
  const dashboard: NavItem = {
    href: ROLE_HOME[role],
    label: "Dashboard",
    icon: <LayoutDashboard className="size-[18px]" />,
  };

  if (role === "ADMIN") {
    return [
      dashboard,
      { href: "/admin/employees", label: "Employees", icon: <Users className="size-[18px]" /> },
      { href: "/admin/appraisals", label: "Appraisals", icon: <UserCheck className="size-[18px]" /> },
      { href: "/admin/cycles", label: "All Cycles", icon: <ClipboardList className="size-[18px]" /> },
      { href: "/admin/mom", label: "Minutes of Meeting", icon: <Building2 className="size-[18px]" /> },
      { href: "/admin/slabs", label: "Increment Slabs", icon: <Layers className="size-[18px]" /> },
      { href: "/admin/extensions", label: "Extensions", icon: <Settings className="size-[18px]" /> },
      { href: "/admin/criteria", label: "Criteria Questions", icon: <ListChecks className="size-[18px]" /> },
      { href: "/admin/tickets", label: "Support Tickets", icon: <Ticket className="size-[18px]" /> },
      { href: "/admin/salary-sheet", label: "Salary Sheet", icon: <BarChart3 className="size-[18px]" /> },
      { href: "/admin/salary-revisions", label: "Salary Revisions", icon: <TrendingUp className="size-[18px]" /> },
      { href: "/admin/notifications", label: "Notification Center", icon: <Bell className="size-[18px]" /> },
      { href: "/admin/sessions", label: "Session Monitor", icon: <MonitorCheck className="size-[18px]" /> },
      { href: "/admin/simulation", label: "Simulation / Time Travel", icon: <FlaskConical className="size-[18px]" /> },
      { href: "/employee", label: "My Appraisal", icon: <Star className="size-[18px]" /> },
      { href: "/history", label: "History", icon: <History className="size-[18px]" /> },
      { href: "/tickets", label: "My Tickets", icon: <Ticket className="size-[18px]" /> },
    ];
  }
  if (role === "MANAGEMENT") {
    return [
      dashboard,
      { href: "/management/mom", label: "Minutes of Meeting", icon: <Building2 className="size-[18px]" /> },
      { href: "/management/salary", label: "Salary Calculator", icon: <BarChart3 className="size-[18px]" /> },
      { href: "/management/slabs", label: "Increment Slabs", icon: <Layers className="size-[18px]" /> },
      { href: "/admin/employees", label: "Employees", icon: <Users className="size-[18px]" /> },
      { href: "/history", label: "History", icon: <History className="size-[18px]" /> },
      { href: "/notifications", label: "Notifications", icon: <Bell className="size-[18px]" /> },
      { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-[18px]" /> },
    ];
  }
  if (role === "HR" || role === "TL" || role === "MANAGER") {
    return [
      { href: "/reviewer", label: "Dashboard", icon: <LayoutDashboard className="size-[18px]" /> },
      ...(role === "HR" ? [{ href: "/reviewer/mom", label: "Minutes of Meeting", icon: <Building2 className="size-[18px]" /> }] : []),
      { href: "/employee", label: "My Appraisal", icon: <UserCheck className="size-[18px]" /> },
      { href: "/history", label: "History", icon: <History className="size-[18px]" /> },
      { href: "/notifications", label: "Notifications", icon: <Bell className="size-[18px]" /> },
      { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-[18px]" /> },
    ];
  }
  if (role === "EMPLOYEE") {
    return [
      dashboard,
      { href: "/history", label: "History", icon: <History className="size-[18px]" /> },
      { href: "/notifications", label: "Notifications", icon: <Bell className="size-[18px]" /> },
      { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-[18px]" /> },
    ];
  }
  if (role === "PARTNER") {
    return [
      { href: "/partner", label: "Dashboard", icon: <LayoutDashboard className="size-[18px]" /> },
      { href: "/admin/employees", label: "Employees", icon: <Users className="size-[18px]" /> },
      { href: "/history", label: "History", icon: <History className="size-[18px]" /> },
      { href: "/notifications", label: "Notifications", icon: <Bell className="size-[18px]" /> },
      { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-[18px]" /> },
    ];
  }
  return [
    dashboard,
    { href: "/history", label: "History", icon: <History className="size-[18px]" /> },
    { href: "/notifications", label: "Notifications", icon: <Bell className="size-[18px]" /> },
    { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-[18px]" /> },
  ];
}

export function SidebarNav({
  role,
  secondaryRole,
}: {
  role: Role;
  secondaryRole?: Role | null;
}) {
  const pathname = usePathname();
  const items = navFor(role, secondaryRole);

  return (
    <nav className="flex-1 px-2 py-2.5 flex flex-col gap-0.5 overflow-y-auto">
      {items.map((item, i) => {
        const exactMatch = pathname === item.href;
        const prefixMatch =
          item.href !== "/" && pathname.startsWith(item.href + "/");
        const longerMatchExists =
          prefixMatch &&
          items.some(
            (other) =>
              other.href !== item.href &&
              pathname.startsWith(other.href) &&
              other.href.length > item.href.length
          );
        const isActive = exactMatch || (prefixMatch && !longerMatchExists);

        return (
          <motion.div
            key={item.href + item.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: i * 0.03,
              duration: 0.22,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <Link
              href={item.href}
              title={item.label}
              className={cn(
                "relative flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 group/nav overflow-hidden",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-bar"
                  className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {/* Icon — always visible */}
              <span
                className={cn(
                  "shrink-0 transition-colors duration-150",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover/nav:text-foreground"
                )}
              >
                {item.icon}
              </span>
              {/* Label — hidden at rest (sidebar 60px), visible when expanded */}
              <span className="truncate text-[13px] font-medium whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-75">
                {item.label}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}
