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
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function navFor(role: Role, secondaryRole?: Role | null): NavItem[] {
  const dashboard: NavItem = {
    href: ROLE_HOME[role],
    label: "Dashboard",
    icon: <LayoutDashboard className="size-4" />,
  };

  if (role === "ADMIN") {
    return [
      dashboard,
      { href: "/admin/employees", label: "Employees", icon: <Users className="size-4" /> },
      { href: "/admin/appraisals", label: "Appraisals", icon: <UserCheck className="size-4" /> },
      { href: "/admin/cycles", label: "All Cycles", icon: <ClipboardList className="size-4" /> },
      { href: "/admin/slabs", label: "Increment Slabs", icon: <Layers className="size-4" /> },
      { href: "/admin/extensions", label: "Extensions", icon: <Settings className="size-4" /> },
      { href: "/admin/criteria", label: "Criteria Questions", icon: <ListChecks className="size-4" /> },
      { href: "/admin/tickets", label: "Support Tickets", icon: <Ticket className="size-4" /> },
      { href: "/admin/salary-sheet", label: "Salary Sheet", icon: <BarChart3 className="size-4" /> },
      { href: "/admin/salary-revisions", label: "Salary Revisions", icon: <TrendingUp className="size-4" /> },
      { href: "/admin/simulation", label: "Simulation / Time Travel", icon: <FlaskConical className="size-4" /> },
      { href: "/employee", label: "My Appraisal", icon: <Star className="size-4" /> },
      { href: "/history", label: "History", icon: <History className="size-4" /> },
      { href: "/tickets", label: "My Tickets", icon: <Ticket className="size-4" /> },
    ];
  }
  if (role === "MANAGEMENT") {
    return [
      dashboard,
      { href: "/management/salary", label: "Salary Calculator", icon: <BarChart3 className="size-4" /> },
      { href: "/management/slabs", label: "Increment Slabs", icon: <Layers className="size-4" /> },
      { href: "/admin/employees", label: "Employees", icon: <Users className="size-4" /> },
      { href: "/history", label: "History", icon: <History className="size-4" /> },
      { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-4" /> },
    ];
  }
  if (role === "HR" || role === "TL" || role === "MANAGER") {
    return [
      { href: "/reviewer", label: "My Reviews", icon: <Star className="size-4" /> },
      { href: "/employee", label: "My Appraisal", icon: <UserCheck className="size-4" /> },
      { href: "/history", label: "History", icon: <History className="size-4" /> },
      { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-4" /> },
    ];
  }
  if (role === "EMPLOYEE") {
    return [
      dashboard,
      { href: "/history", label: "History", icon: <History className="size-4" /> },
      { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-4" /> },
    ];
  }
  if (role === "PARTNER") {
    return [
      { href: "/partner", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
      { href: "/admin/employees", label: "Employees", icon: <Users className="size-4" /> },
      { href: "/history", label: "History", icon: <History className="size-4" /> },
      { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-4" /> },
    ];
  }
  return [
    dashboard,
    { href: "/history", label: "History", icon: <History className="size-4" /> },
    { href: "/tickets", label: "Support Tickets", icon: <Ticket className="size-4" /> },
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
    <nav className="flex-1 p-3 space-y-0.5 text-sm overflow-y-auto">
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
              delay: i * 0.04,
              duration: 0.25,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <Link
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150 group overflow-hidden text-sm",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
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
              <span
                className={cn(
                  "transition-colors duration-150 shrink-0",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}
