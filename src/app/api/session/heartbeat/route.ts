import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.sessionToken) return NextResponse.json({ ok: false }, { status: 401 });
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  const updated = await prisma.userSession.updateMany({
    where: { organizationId, token: session.user.sessionToken, status: "ACTIVE" },
    data: { lastSeenAt: new Date() },
  });

  if (updated.count > 0) {
    await prisma.securityEvent.create({
      data: {
        organizationId,
        userId: session.user.id,
        email: session.user.email ?? null,
        event: "SESSION_ACTIVITY",
        outcome: "SUCCESS",
        ipAddress: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
        sessionToken: session.user.sessionToken,
        details: { activity: "HEARTBEAT" },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
