import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { LogOut, FlaskConical } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { PersistentPopup } from "@/components/persistent-popup";
import { MobileNav } from "@/components/mobile-nav";
import { ContextualTips } from "@/components/contextual-tips";
import { InactivityGuard } from "@/components/inactivity-guard";

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

  const timeoutSetting = await prisma.systemSetting.findUnique({ where: { key: "SESSION_TIMEOUT_MINUTES" } });

  const timeoutMinutes = timeoutSetting ? parseInt(timeoutSetting.value, 10) : 10;
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
    where: { userId: id, critical: true, dismissed: false },
    orderBy: [{ urgent: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      type: true,
      message: true,
      link: true,
      createdAt: true,
      urgent: true,
      important: true,
    },
  });

  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Desktop sidebar — slim collapsible ── */}
      <aside
        className="hidden md:flex shrink-0 border-r border-border bg-sidebar flex-col sticky top-0 h-screen overflow-hidden shadow-sm transition-all duration-200 ease-in-out group/sidebar w-[60px] hover:w-[220px]"
      >
        {/* Logo area */}
        <div className="px-3 py-[18px] border-b border-border flex items-center gap-2.5 min-h-[64px] overflow-hidden">
          <Link href={ROLE_HOME[role]} className="flex items-center gap-2.5 shrink-0">
            <div className="size-9 rounded-[10px] bg-gradient-teal flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
              A
            </div>
            <div className="overflow-hidden whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-75">
              <div className="text-xs font-bold text-foreground leading-tight">Adarsh Shipping</div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">Appraisal Portal</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <SidebarNav role={role} secondaryRole={secondaryRole} />

        {/* User footer */}
        <div className="px-2 py-3 border-t border-border space-y-1 overflow-hidden">
          {/* Avatar + name */}
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="size-[30px] rounded-full bg-gradient-teal flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-75">
              <div className="text-xs font-semibold text-foreground truncate">{name}</div>
              <div className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${roleColors[role]}`}>
                {role}
              </div>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-1 px-1">
            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>

          {/* Sign out */}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 text-xs"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-75">
                Sign out
              </span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Mobile layout ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar sticky top-0 z-40 shadow-sm">
          <Link href={ROLE_HOME[role]} className="flex items-center gap-2.5">
            <div className="size-8 rounded-[10px] bg-gradient-teal flex items-center justify-center text-white text-sm font-bold shadow-sm">
              A
            </div>
            <div>
              <div className="font-bold text-foreground text-sm leading-tight">Adarsh Shipping</div>
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Appraisal Portal</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
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

      {/* Contextual workflow tips */}
      <ContextualTips role={role} />

      {/* Inactivity timeout guard */}
      <InactivityGuard timeoutMinutes={timeoutMinutes} />
    </div>
  );
}
