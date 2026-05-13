"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";
import {
  getVisibleWorkspaces,
  getWorkspaceForPath,
  getWorkspaceNavItems,
  getWorkspaceStatusLabel,
} from "@/lib/workspace-navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MobileNavProps {
  role: Role;
  secondaryRole?: Role | null;
  userName: string;
  userRole: Role;
  userInitial: string;
  roleColorClass: string;
  enabledModules?: string[] | null;
  homeHref?: string;
  organizationId: string;
}

export function MobileNav({
  role,
  secondaryRole,
  userName,
  userRole,
  userInitial,
  roleColorClass,
  enabledModules,
  homeHref,
  organizationId,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const workspaces = useMemo(
    () => getVisibleWorkspaces(enabledModules, role, secondaryRole),
    [enabledModules, role, secondaryRole],
  );
  const currentWorkspaceKey =
    getWorkspaceForPath(pathname) ?? workspaces[0]?.key ?? null;
  const navItems = currentWorkspaceKey
    ? getWorkspaceNavItems(currentWorkspaceKey, role, secondaryRole, homeHref)
    : [];

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "LOGGED_OUT" }),
      });
    } catch {
      // noop
    }

    await signOut({ callbackUrl: "/" });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 transition-colors hover:bg-muted"
        aria-label="Open menu"
      >
        <Menu className="size-5 text-foreground" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex w-80 flex-col border-l border-border bg-sidebar shadow-2xl"
            >
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#00cec4] text-xs font-bold text-white">
                      {userInitial}
                    </div>
                    <div>
                      <div className="max-w-[160px] truncate text-xs font-semibold text-foreground">
                        {userName}
                      </div>
                      <span
                        className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${roleColorClass}`}
                      >
                        {userRole}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 transition-colors hover:bg-muted"
                    aria-label="Close menu"
                  >
                    <X className="size-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3">
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Workspaces
                </div>
                <div className="space-y-1">
                  {workspaces.map((workspace) => {
                    const isActive = workspace.key === currentWorkspaceKey;
                    const Icon = workspace.icon;

                    return (
                      <Link
                        key={workspace.key}
                        href={`/org/${organizationId}/workspace/${workspace.key}`}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                          isActive ? "bg-primary/10" : "hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg",
                            workspace.accentClass,
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm font-medium", isActive ? "text-primary" : "text-foreground")}>
                            {workspace.label}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {getWorkspaceStatusLabel(workspace)}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mb-2 mt-5 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {workspaces.find((workspace) => workspace.key === currentWorkspaceKey)?.shortLabel ?? "Navigation"}
                </div>
                <div className="space-y-1">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = isPathActive(pathname, item.href, navItems);
                    const showGroupHeading = item.group && (index === 0 || navItems[index - 1]?.group !== item.group);

                    return (
                      <div key={`${item.href}-${item.label}`}>
                        {showGroupHeading && (
                          <div className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            {item.group}
                          </div>
                        )}
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          {item.label}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border p-4">
                <button
                  onClick={() => setSignOutOpen(true)}
                  disabled={signingOut}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="size-3.5" />
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent showCloseButton={!signingOut}>
          <DialogHeader>
            <DialogTitle>Sign Out?</DialogTitle>
            <DialogDescription>
              You will return to the home page and this session will be ended.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setSignOutOpen(false)}
              disabled={signingOut}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
