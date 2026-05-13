import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

// Admin-only: get all active sessions with user details
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN") {
    return NextResponse.json([], { status: 403 });
  }
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  // Consider sessions active if lastSeenAt within last 2 minutes
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);

  const sessions = await prisma.userSession.findMany({
    where: { organizationId, status: "ACTIVE", lastSeenAt: { gte: cutoff } },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return NextResponse.json(
    sessions.map((s) => ({
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
    }))
  );
}
