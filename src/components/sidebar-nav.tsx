"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";
import {
  getVisibleWorkspaces,
  getWorkspaceForPath,
  getWorkspaceNavItems,
  getWorkspaceStatusLabel,
} from "@/lib/workspace-navigation";

export function SidebarNav({
  role,
  secondaryRole,
  enabledModules,
  homeHref,
  organizationId,
}: {
  role: Role;
  secondaryRole?: Role | null;
  enabledModules?: string[] | null;
  homeHref?: string;
  organizationId: string;
}) {
  const pathname = usePathname();
  const workspaces = getVisibleWorkspaces(enabledModules, role, secondaryRole);
  const currentWorkspaceKey =
    getWorkspaceForPath(pathname) ?? workspaces[0]?.key ?? null;
  const currentWorkspace = workspaces.find(
    (workspace) => workspace.key === currentWorkspaceKey,
  );
  const navItems = currentWorkspace
    ? getWorkspaceNavItems(currentWorkspace.key, role, secondaryRole, homeHref)
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="px-2 pb-2 pt-3">
        <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
          Workspaces
        </div>
        <div className="mt-2 space-y-1">
          {workspaces.map((workspace, index) => {
            const isActive = workspace.key === currentWorkspaceKey;
            const href = `/org/${organizationId}/workspace/${workspace.key}`;
            const Icon = workspace.icon;

            return (
              <motion.div
                key={workspace.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: index * 0.03,
                  duration: 0.22,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <Link
                  href={href}
                  title={workspace.label}
                  className={cn(
                    "relative flex min-h-[42px] items-center gap-3 overflow-hidden rounded-xl px-3 py-2 transition-colors duration-200",
                    isActive ? "bg-white/8" : "hover:bg-white/5",
                  )}
                >
                  {isActive ? (
                    <motion.div
                      layoutId="workspace-active-bar"
                      className="absolute left-0 top-[7px] bottom-[7px] w-[3px] rounded-r-sm bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "z-10 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      workspace.accentClass,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                    <span className="block truncate text-sm font-medium text-white/90">
                      {workspace.shortLabel}
                    </span>
                    <span className="block truncate text-[11px] text-white/45">
                      {getWorkspaceStatusLabel(workspace)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-white/25 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-1 min-h-0 flex-1 overflow-hidden border-t border-white/6 px-2 pt-3">
        <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
          {currentWorkspace?.shortLabel ?? "Navigation"}
        </div>
        <nav className="mt-2 flex h-full flex-col gap-1 overflow-y-auto overflow-x-hidden pb-3">
          {navItems.map((item, index) => {
            const isActive = isPathActive(pathname, item.href, navItems);
            const Icon = item.icon;
            const showGroupHeading = item.group && (index === 0 || navItems[index - 1]?.group !== item.group);

            return (
              <Fragment key={`${item.href}-${item.label}`}>
                {showGroupHeading && (
                  <div className="px-2 pb-0.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                    {item.group}
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: index * 0.02,
                    duration: 0.22,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <Link
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "relative grid h-[36px] grid-cols-[36px_1fr] items-center overflow-hidden rounded-lg transition-colors duration-200",
                      isActive ? "bg-primary/12" : "hover:bg-white/5",
                    )}
                  >
                    {isActive ? (
                      <motion.div
                        layoutId="nav-active-bar"
                        className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-sm bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    ) : null}
                    <span className={cn("z-10 flex items-center justify-center", isActive ? "text-primary" : "text-white/55")}>
                      <Icon className="size-[15px]" />
                    </span>
                    <span
                      className={cn(
                        "z-10 min-w-0 -translate-x-1 truncate whitespace-nowrap text-[12px] font-medium opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100",
                        isActive ? "text-primary" : "text-white/55",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              </Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function isPathActive(
  pathname: string,
  href: string,
  items: { href: string }[],
) {
  const exactMatch = pathname === href;
  const prefixMatch = href !== "/" && pathname.startsWith(`${href}/`);
  const longerMatchExists =
    prefixMatch &&
    items.some(
      (other) =>
        other.href !== href &&
        pathname.startsWith(other.href) &&
        other.href.length > href.length,
    );

  return exactMatch || (prefixMatch && !longerMatchExists);
}
