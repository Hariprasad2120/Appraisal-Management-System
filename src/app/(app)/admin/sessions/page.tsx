import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { FadeIn } from "@/components/motion-div";
import { SessionsDashboard } from "./sessions-dashboard";
import { MonitorCheck } from "lucide-react";

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN") {
    redirect("/");
  }

  const renderNow = new Date();

  // Active sessions: lastSeenAt within last 2 minutes
  const cutoff = new Date(renderNow);
  cutoff.setMinutes(cutoff.getMinutes() - 2);

  const [activeSessions, historySessions, securityEvents, timeoutSetting] = await Promise.all([
    prisma.userSession.findMany({
      where: { status: "ACTIVE", lastSeenAt: { gte: cutoff } },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { lastSeenAt: "desc" },
    }),
    prisma.userSession.findMany({
      orderBy: { loginAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.securityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.systemSetting.findUnique({ where: { key: "SESSION_TIMEOUT_MINUTES" } }),
  ]);

  const timeoutMinutes = timeoutSetting ? parseInt(timeoutSetting.value, 10) : 10;

  const mapSession = (s: typeof activeSessions[0]) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    userEmail: s.user.email,
    userRole: s.user.role,
    loginAt: s.loginAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    ipAddress: s.ipAddress,
    location: s.location,
    durationMs: s.lastSeenAt.getTime() - s.loginAt.getTime(),
  });

  const mapHistory = (s: typeof historySessions[0]) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    userEmail: s.user.email,
    userRole: s.user.role,
    loginAt: s.loginAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    logoutAt: s.logoutAt?.toISOString() ?? null,
    status: s.status,
    ipAddress: s.ipAddress,
    location: s.location,
    durationMs: (s.logoutAt ?? s.lastSeenAt).getTime() - s.loginAt.getTime(),
  });

  const mapSecurityEvent = (event: typeof securityEvents[0]) => ({
    id: event.id,
    event: event.event,
    outcome: event.outcome,
    email: event.email,
    userName: event.user?.name ?? null,
    userEmail: event.user?.email ?? null,
    userRole: event.user?.role ?? null,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    createdAt: event.createdAt.toISOString(),
  });

  return (
    <div className="w-full max-w-5xl space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MonitorCheck className="size-6" /> Session Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time active sessions, session history, and inactivity timeout configuration.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <SessionsDashboard
          initialActive={activeSessions.map(mapSession)}
          history={historySessions.map(mapHistory)}
          securityEvents={securityEvents.map(mapSecurityEvent)}
          renderedAt={renderNow.toISOString()}
          timeoutMinutes={timeoutMinutes}
        />
      </FadeIn>
    </div>
  );
}
