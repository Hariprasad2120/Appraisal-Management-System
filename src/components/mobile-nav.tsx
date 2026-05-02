"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
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
  TrendingUp,
  ListChecks,
  Ticket,
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
      {
        href: "/admin/employees",
        label: "Employees",
        icon: <Users className="size-4" />,
      },
      {
        href: "/admin/cycles",
        label: "All Cycles",
        icon: <ClipboardList className="size-4" />,
      },
      {
        href: "/admin/slabs",
        label: "Increment Slabs",
        icon: <Layers className="size-4" />,
      },
      {
        href: "/admin/extensions",
        label: "Extensions",
        icon: <Settings className="size-4" />,
      },
      {
        href: "/admin/criteria",
        label: "Criteria",
        icon: <ListChecks className="size-4" />,
      },
      {
        href: "/admin/tickets",
        label: "Support Tickets",
        icon: <Ticket className="size-4" />,
      },
      {
        href: "/admin/salary-sheet",
        label: "Salary Sheet",
        icon: <BarChart3 className="size-4" />,
      },
      {
        href: "/admin/salary-revisions",
        label: "Salary Revisions",
        icon: <TrendingUp className="size-4" />,
      },
      {
        href: "/history",
        label: "History",
        icon: <History className="size-4" />,
      },
    ];
  }
  if (role === "MANAGEMENT") {
    return [
      dashboard,
      {
        href: "/management/salary",
        label: "Salary Calculator",
        icon: <BarChart3 className="size-4" />,
      },
      {
        href: "/admin/employees",
        label: "Employees",
        icon: <Users className="size-4" />,
      },
      {
        href: "/history",
        label: "History",
        icon: <History className="size-4" />,
      },
      {
        href: "/tickets",
        label: "Support Tickets",
        icon: <Ticket className="size-4" />,
      },
    ];
  }
  if (role === "HR" || role === "TL" || role === "MANAGER") {
    return [
      {
        href: "/reviewer",
        label: "My Reviews",
        icon: <Star className="size-4" />,
      },
      {
        href: "/assignments",
        label: "Assignments",
        icon: <ClipboardList className="size-4" />,
      },
      {
        href: "/employee",
        label: "My Appraisal",
        icon: <UserCheck className="size-4" />,
      },
      {
        href: "/history",
        label: "Appraisal History",
        icon: <History className="size-4" />,
      },
      {
        href: "/tickets",
        label: "Support Tickets",
        icon: <Ticket className="size-4" />,
      },
    ];
  }
  if (role === "EMPLOYEE") {
    return [
      dashboard,
      {
        href: "/history",
        label: "History",
        icon: <History className="size-4" />,
      },
      {
        href: "/tickets",
        label: "Support Tickets",
        icon: <Ticket className="size-4" />,
      },
    ];
  }
  if (role === "PARTNER") {
    return [
      {
        href: "/partner",
        label: "Dashboard",
        icon: <LayoutDashboard className="size-4" />,
      },
      {
        href: "/admin/employees",
        label: "Employees",
        icon: <Users className="size-4" />,
      },
      {
        href: "/history",
        label: "History",
        icon: <History className="size-4" />,
      },
      {
        href: "/tickets",
        label: "Support Tickets",
        icon: <Ticket className="size-4" />,
      },
    ];
  }
  return [
    dashboard,
    {
      href: "/history",
      label: "History",
      icon: <History className="size-4" />,
    },
  ];
}

interface MobileNavProps {
  role: Role;
  secondaryRole?: Role | null;
  userName: string;
  userRole: Role;
  userInitial: string;
  roleColorClass: string;
}

export function MobileNav({
  role,
  secondaryRole,
  userName,
  userRole,
  userInitial,
  roleColorClass,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navFor(role, secondaryRole);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu className="size-5 text-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-sidebar border-l border-border z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-gradient-to-br from-primary to-[#00cec4] flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {userInitial}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                      {userName}
                    </div>
                    <span
                      className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${roleColorClass}`}
                    >
                      {userRole}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close menu"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {items.map((item) => {
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
                  const isActive =
                    exactMatch || (prefixMatch && !longerMatchExists);

                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Sign out */}
              <div className="p-4 border-t border-border">
                <button
                  onClick={async () => {
                    try {
                      await fetch("/api/session/end", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reason: "LOGGED_OUT" }),
                      });
                    } catch {
                      /* silent */
                    }
                    await signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
