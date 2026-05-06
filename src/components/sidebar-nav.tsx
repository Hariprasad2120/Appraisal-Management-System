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
  Star,
  ShieldCheck,
  Database,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  activeBg: string;
  activeBar: string;
  activeLabel: string;
};

function item(
  href: string,
  label: string,
  icon: React.ReactNode,
  iconColor: string,
  activeBg: string,
  activeBar: string,
  activeLabel: string,
): NavItem {
  return { href, label, icon, iconColor, activeBg, activeBar, activeLabel };
}

// DS per-item color palette
const C = {
  teal: {
    color: "#2dd4bf",
    activeBg: "rgba(14,137,149,0.12)",
    bar: "#0e8a95",
    label: "#2dd4bf",
  },
  blue: {
    color: "#60a5fa",
    activeBg: "rgba(59,130,246,0.10)",
    bar: "#3b82f6",
    label: "#60a5fa",
  },
  purple: {
    color: "#a78bfa",
    activeBg: "rgba(124,58,237,0.10)",
    bar: "#7c3aed",
    label: "#a78bfa",
  },
  cyan: {
    color: "#22d3ee",
    activeBg: "rgba(0,206,196,0.09)",
    bar: "#00cec4",
    label: "#22d3ee",
  },
  green: {
    color: "#4ade80",
    activeBg: "rgba(34,197,94,0.09)",
    bar: "#22c55e",
    label: "#4ade80",
  },
  amber: {
    color: "#fbbf24",
    activeBg: "rgba(255,170,45,0.09)",
    bar: "#ffaa2d",
    label: "#fbbf24",
  },
  orange: {
    color: "#fb923c",
    activeBg: "rgba(255,131,51,0.09)",
    bar: "#ff8333",
    label: "#fb923c",
  },
  rose: {
    color: "#fb7185",
    activeBg: "rgba(244,63,94,0.09)",
    bar: "#f43f5e",
    label: "#fb7185",
  },
  slate: {
    color: "#94a3b8",
    activeBg: "rgba(100,116,139,0.09)",
    bar: "#64748b",
    label: "#94a3b8",
  },
};

function mkItem(
  href: string,
  label: string,
  icon: React.ReactNode,
  c: (typeof C)[keyof typeof C],
): NavItem {
  return item(href, label, icon, c.color, c.activeBg, c.bar, c.label);
}

function navFor(role: Role, secondaryRole?: Role | null): NavItem[] {
  const sz = "size-[15px]";
  const dashboard = mkItem(
    ROLE_HOME[role],
    "Dashboard",
    <LayoutDashboard className={sz} />,
    C.teal,
  );

  if (role === "ADMIN") {
    return [
      dashboard,
      mkItem("/admin/employees", "Employees", <Users className={sz} />, C.blue),
      mkItem("/admin/ownership", "Ownership", <UserCheck className={sz} />, C.cyan),
      mkItem(
        "/admin/appraisals",
        "Appraisals",
        <UserCheck className={sz} />,
        C.purple,
      ),
      mkItem(
        "/admin/cycles",
        "All Cycles",
        <ClipboardList className={sz} />,
        C.cyan,
      ),
      mkItem(
        "/admin/mom",
        "Minutes of Meeting",
        <Building2 className={sz} />,
        C.slate,
      ),
      mkItem(
        "/admin/slabs",
        "Increment Slabs",
        <Layers className={sz} />,
        C.amber,
      ),
      mkItem(
        "/admin/extensions",
        "Extensions",
        <Settings className={sz} />,
        C.orange,
      ),
      mkItem(
        "/admin/criteria",
        "Criteria Questions",
        <ListChecks className={sz} />,
        C.orange,
      ),
      mkItem(
        "/admin/kpi",
        "Department KPI",
        <BarChart3 className={sz} />,
        C.green,
      ),
      mkItem(
        "/admin/tickets",
        "Support Tickets",
        <Ticket className={sz} />,
        C.rose,
      ),
      mkItem(
        "/admin/salary-sheet",
        "Salary Sheet",
        <BarChart3 className={sz} />,
        C.green,
      ),
      mkItem(
        "/admin/salary-revisions",
        "Salary Revisions",
        <TrendingUp className={sz} />,
        C.green,
      ),
      mkItem(
        "/admin/notifications",
        "Notification Center",
        <Bell className={sz} />,
        C.amber,
      ),
      mkItem(
        "/admin/passkeys",
        "Passkey Resets",
        <ShieldCheck className={sz} />,
        C.purple,
      ),
      mkItem(
        "/admin/data-tools",
        "Data Tools",
        <Database className={sz} />,
        C.blue,
      ),
      mkItem(
        "/admin/sessions",
        "Session Monitor",
        <MonitorCheck className={sz} />,
        C.slate,
      ),
      mkItem(
        "/admin/simulation",
        "Simulation",
        <FlaskConical className={sz} />,
        C.slate,
      ),
      mkItem("/history", "History", <History className={sz} />, C.slate),
    ];
  }
  if (role === "MANAGEMENT") {
    return [
      dashboard,
      mkItem(
        "/management/mom",
        "Minutes of Meeting",
        <Building2 className={sz} />,
        C.slate,
      ),
      mkItem(
        "/management/salary",
        "Salary Calculator",
        <BarChart3 className={sz} />,
        C.green,
      ),
      mkItem(
        "/management/slabs",
        "Increment Slabs",
        <Layers className={sz} />,
        C.amber,
      ),
      mkItem(
        "/management/arrears",
        "Arrear Approvals",
        <TrendingUp className={sz} />,
        C.orange,
      ),
      mkItem(
        "/management/kpi",
        "KPI Reports",
        <BarChart3 className={sz} />,
        C.green,
      ),
      mkItem("/admin/employees", "Employees", <Users className={sz} />, C.blue),
      mkItem("/history", "History", <History className={sz} />, C.slate),
      mkItem(
        "/notifications",
        "Notifications",
        <Bell className={sz} />,
        C.amber,
      ),
      mkItem("/tickets", "Support Tickets", <Ticket className={sz} />, C.rose),
    ];
  }
  if (role === "HR" || role === "TL" || role === "MANAGER" || role === "REVIEWER") {
    return [
      mkItem(
        "/reviewer",
        "Dashboard",
        <LayoutDashboard className={sz} />,
        C.teal,
      ),
      ...(role === "HR"
        ? [
            mkItem(
              "/reviewer/mom",
              "Minutes of Meeting",
              <Building2 className={sz} />,
              C.slate,
            ),
          ]
        : []),
      mkItem(
        "/assignments",
        "All Assignments",
        <ClipboardList className={sz} />,
        C.blue,
      ),
      ...(role === "TL"
        ? [
            mkItem(
              "/reviewer/kpi",
              "Team KPI",
              <BarChart3 className={sz} />,
              C.green,
            ),
          ]
        : []),
      mkItem("/employee", "My Appraisal", <Star className={sz} />, C.purple),
      mkItem(
        "/history",
        "Appraisal History",
        <History className={sz} />,
        C.slate,
      ),
      mkItem(
        "/notifications",
        "Notifications",
        <Bell className={sz} />,
        C.amber,
      ),
      mkItem("/tickets", "Support Tickets", <Ticket className={sz} />, C.rose),
    ];
  }
  if (role === "EMPLOYEE") {
    return [
      dashboard,
      mkItem("/history", "History", <History className={sz} />, C.slate),
      mkItem(
        "/notifications",
        "Notifications",
        <Bell className={sz} />,
        C.amber,
      ),
      mkItem("/tickets", "Support Tickets", <Ticket className={sz} />, C.rose),
    ];
  }
  if (role === "PARTNER") {
    return [
      mkItem(
        "/partner",
        "Dashboard",
        <LayoutDashboard className={sz} />,
        C.teal,
      ),
      mkItem("/admin/employees", "Employees", <Users className={sz} />, C.blue),
      mkItem("/history", "History", <History className={sz} />, C.slate),
      mkItem(
        "/notifications",
        "Notifications",
        <Bell className={sz} />,
        C.amber,
      ),
      mkItem("/tickets", "Support Tickets", <Ticket className={sz} />, C.rose),
    ];
  }
  return [
    dashboard,
    mkItem("/history", "History", <History className={sz} />, C.slate),
    mkItem("/notifications", "Notifications", <Bell className={sz} />, C.amber),
    mkItem("/tickets", "Support Tickets", <Ticket className={sz} />, C.rose),
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
    <nav className="flex-1 px-1.5 py-2 flex flex-col gap-px overflow-y-auto overflow-x-hidden">
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
              other.href.length > item.href.length,
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
                "relative grid h-[34px] grid-cols-[52px_1fr] items-center rounded-[4px] transition-colors duration-200 group/nav overflow-hidden",
                "hover:bg-white/5",
              )}
              style={isActive ? { background: item.activeBg } : undefined}
            >
              {/* Left accent bar */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bar"
                  className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-sm"
                  style={{ background: item.activeBar }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}

              {/* Colored icon */}
              <span
                className="z-10 flex h-full w-[52px] shrink-0 items-center justify-center"
                style={{ color: item.iconColor }}
              >
                {item.icon}
              </span>

              {/* Label */}
              <span
                className="z-10 w-[174px] min-w-0 -translate-x-1 truncate whitespace-nowrap text-[12px] font-medium opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100"
                style={
                  isActive
                    ? { color: item.activeLabel }
                    : { color: "var(--muted-foreground)" }
                }
              >
                {item.label}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}
