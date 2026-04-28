import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { LogOut, Bell, FlaskConical } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { PersistentPopup } from "@/components/persistent-popup";
import { MobileNav } from "@/components/mobile-nav";

const roleColors: Record<Role, string> = {
  ADMIN:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  MANAGEMENT:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  MANAGER:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  HR: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  TL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  EMPLOYEE:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  PARTNER:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) return null;
  const { id, name, role, secondaryRole } = session.user;

  const unread = await prisma.notification.count({
    where: { userId: id, read: false },
  });

  const isAdmin = role === "ADMIN" || secondaryRole === "ADMIN";
  let isSimulationActive = false;
  if (isAdmin) {
    const lastSimLog = await prisma.auditLog.findFirst({
      where: { action: "SIMULATION_MODE" },
      orderBy: { createdAt: "desc" },
    });
    const after = lastSimLog?.after as { active?: boolean } | null;
    isSimulationActive = after?.active === true;
  }

  const persistentNotifications = await prisma.notification.findMany({
    where: { userId: id, persistent: true, dismissed: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      message: true,
      link: true,
      createdAt: true,
    },
  });

  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-sidebar flex-col sticky top-0 h-screen overflow-hidden shadow-sm">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <Link href={ROLE_HOME[role]} className="block group">
            <div className="font-bold text-foreground text-sm tracking-tight group-hover:text-primary transition-colors duration-200">
              Adarsh Shipping
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium tracking-widest uppercase">
              Appraisal Portal
            </p>
          </Link>
        </div>

        {/* Nav */}
        <SidebarNav role={role} secondaryRole={secondaryRole} />

        {/* User footer */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="size-8 rounded-full bg-gradient-to-br from-primary to-[#00cec4] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
              {initial}
            </div>

            {/* Name + role */}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground truncate">
                {name}
              </div>
              <span
                className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${roleColors[role]}`}
              >
                {role}
              </span>
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notification bell */}
            {unread > 0 && (
              <Link href="/notifications" className="relative shrink-0 group">
                <Bell className="size-4 text-muted-foreground group-hover:text-amber-500 transition-colors duration-200" />
                <span className="absolute -top-1.5 -right-1.5 size-3.5 bg-amber-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold leading-none">
                  {unread > 9 ? "9+" : unread}
                </span>
              </Link>
            )}
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-3 mr-1.5" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* ── Mobile layout ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar sticky top-0 z-40 shadow-sm">
          <Link href={ROLE_HOME[role]} className="block">
            <div className="font-bold text-foreground text-sm">
              Adarsh Shipping
            </div>
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">
              Appraisal Portal
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {unread > 0 && (
              <Link href="/notifications" className="relative">
                <Bell className="size-4 text-muted-foreground" />
                <span className="absolute -top-1.5 -right-1.5 size-3.5 bg-amber-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                  {unread > 9 ? "9+" : unread}
                </span>
              </Link>
            )}
            <MobileNav
              role={role}
              secondaryRole={secondaryRole}
              userName={name ?? ""}
              userRole={role}
              userInitial={initial}
              roleColorClass={roleColors[role]}
            />
          </div>
        </header>

        {/* Simulation mode banner */}
        {isSimulationActive && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/90 text-white text-xs font-semibold z-50">
            <FlaskConical className="size-3.5 shrink-0" />
            Simulation Mode Active — deadlines modified for testing
            <Link href="/admin/simulation" className="ml-auto underline underline-offset-2 hover:opacity-80">
              Manage →
            </Link>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>

      {/* Persistent popup notifications */}
      <PersistentPopup
        initialNotifications={persistentNotifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
