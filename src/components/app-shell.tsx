import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { FlaskConical } from "lucide-react";
import { SidebarShell } from "@/components/sidebar-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { PersistentPopup } from "@/components/persistent-popup";
import { MobileNav } from "@/components/mobile-nav";
import { ContextualTips } from "@/components/contextual-tips";
import { InactivityGuard } from "@/components/inactivity-guard";
import { AppHeader } from "@/components/app-header";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getOrganizationLogoUrl } from "@/lib/organization-branding";
import { resolvePlatformHome } from "@/lib/platform-setup";
import { getSessionTimeoutMinutes } from "@/lib/session";
import { getEnabledModuleKeys, getUserOrganizationMemberships } from "@/lib/tenant";

const getSimulationActive = unstable_cache(
  async (organizationId: string) => {
    const lastSimLog = await prisma.auditLog.findFirst({
      where: { organizationId, action: "SIMULATION_MODE" },
      orderBy: { createdAt: "desc" },
      select: { after: true },
    });
    const after = lastSimLog?.after as { active?: boolean } | null;
    return after?.active === true;
  },
  ["simulation-active"],
  { revalidate: 30 }
);

const getTimeoutMinutes = unstable_cache(
  async (organizationId: string) => {
    return getSessionTimeoutMinutes(organizationId);
  },
  ["session-timeout-minutes"],
  { revalidate: 5 }
);

const roleColors: Record<string, string> = {
  ADMIN: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  MANAGEMENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  MANAGER: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  HR: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  TL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  REVIEWER: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  EMPLOYEE: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  PARTNER: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession();
  if (!session?.user) return null;
  const { id, name, role, secondaryRole } = session.user;
  const activeOrganizationId = session.user.activeOrganizationId;
  const platformState = session.user.platformRole === "PLATFORM_SUPER_ADMIN"
    ? await resolvePlatformHome(session.user)
    : null;
  const homeHref = platformState?.homePath ?? ROLE_HOME[role];

  if (platformState?.needsSetup) {
    redirect(platformState.homePath);
  }

  if (!activeOrganizationId) {
    redirect("/platform/setup");
  }

  const isAdmin = role === "ADMIN" || secondaryRole === "ADMIN";
  const [timeoutMinutes, isSimulationActive, organization, memberships, enabledModules, persistentNotifications] = await Promise.all([
    getTimeoutMinutes(activeOrganizationId),
    isAdmin ? getSimulationActive(activeOrganizationId) : Promise.resolve(false),
    prisma.organization.findUnique({
      where: { id: activeOrganizationId },
      select: { name: true, logoUrl: true, primaryColor: true },
    }),
    getUserOrganizationMemberships(id),
    getEnabledModuleKeys(activeOrganizationId),
    prisma.notification.findMany({
      where: { organizationId: activeOrganizationId, userId: id, critical: true, dismissed: false },
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
    }),
  ]);
  const organizationName = organization?.name ?? session.user.organizationName ?? "Organization";
  const logoSrc = getOrganizationLogoUrl(organization?.logoUrl);
  const organizationOptions = memberships
    .filter((membership) =>
      session.user.accountId
        ? membership.organization.accountId === session.user.accountId
        : true,
    )
    .map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      logoUrl: membership.organization.logoUrl,
      status: membership.organization.status,
      roles: membership.roleAssignments.map((assignment) => assignment.role),
    }));

  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* ── Desktop sidebar ── */}
      <SidebarShell
        role={role}
        secondaryRole={secondaryRole}
        name={name ?? ""}
        homeHref={homeHref}
        organizationId={activeOrganizationId}
        organizationName={organizationName}
        logoSrc={logoSrc}
        enabledModules={enabledModules}
      />

      {/* ── Mobile layout ── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar sticky top-0 z-40 shadow-sm">
          <Link href={homeHref} className="flex items-center gap-2.5">
            <div className="size-8 rounded-[10px] overflow-hidden bg-muted shadow-sm flex items-center justify-center">
              <Image src={logoSrc} alt={organizationName} width={32} height={32} className="object-contain" unoptimized />
            </div>
            <div>
              <div className="font-bold text-foreground text-sm leading-tight">{organizationName}</div>
              <div className="text-[10px] text-muted-foreground">Performance Platform</div>
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
              enabledModules={enabledModules}
              homeHref={homeHref}
              organizationId={activeOrganizationId}
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

        <AppHeader
          userName={name ?? ""}
          organizationName={organizationName}
          sessionToken={session.user.sessionToken}
          enabledModules={enabledModules}
          organizationOptions={organizationOptions}
          accountName={session.user.accountName ?? null}
          showAccountActions={
            session.user.accountRole === "ACCOUNT_OWNER" ||
            session.user.accountRole === "ACCOUNT_ADMIN"
          }
        />

        {/* Main content */}
        <main className="min-h-0 flex-1 overflow-auto overflow-x-hidden p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
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
      <RealtimeRefresh />
    </div>
  );
}
