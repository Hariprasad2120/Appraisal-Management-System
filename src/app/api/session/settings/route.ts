import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_SESSION_TIMEOUT_MINUTES, getSessionTimeoutMinutes, SESSION_TIMEOUT_SETTING_KEY } from "@/lib/session";

const TIMEOUT_ADMIN_ROLES = ["ORG_OWNER", "ORG_ADMIN"] as const;

async function canManageOrganizationTimeout(userId: string, organizationId: string) {
  const assignment = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      organizationId,
      membership: { status: "ACTIVE" },
      role: { in: [...TIMEOUT_ADMIN_ROLES] },
    },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    timeoutMinutes: await getSessionTimeoutMinutes(session.user.activeOrganizationId),
  });
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) {
    return NextResponse.json({ ok: false, error: "No active organization." }, { status: 400 });
  }
  if (!(await canManageOrganizationTimeout(session.user.id, organizationId))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const minutes = parseInt(body.timeoutMinutes, 10);
  if (isNaN(minutes) || minutes < 1 || minutes > 480) {
    return NextResponse.json({ ok: false, error: "Must be 1–480 minutes" }, { status: 400 });
  }

  const previous = await prisma.systemSetting.findFirst({
    where: { organizationId, key: SESSION_TIMEOUT_SETTING_KEY },
    select: { id: true, value: true },
  });

  await prisma.$transaction(async (tx) => {
    if (previous) {
      await tx.systemSetting.update({
        where: { id: previous.id },
        data: { value: String(minutes), updatedById: session.user.id },
      });
    } else {
      await tx.systemSetting.create({
        data: {
          organizationId,
          key: SESSION_TIMEOUT_SETTING_KEY,
          value: String(minutes),
          updatedById: session.user.id,
        },
      });
    }

    await tx.securityEvent.create({
      data: {
        organizationId,
        userId: session.user.id,
        email: session.user.email ?? null,
        event: "SESSION_SETTING_UPDATED",
        outcome: "SUCCESS",
        ipAddress: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
        sessionToken: session.user.sessionToken,
        details: {
          setting: SESSION_TIMEOUT_SETTING_KEY,
          before: previous?.value ?? String(DEFAULT_SESSION_TIMEOUT_MINUTES),
          after: String(minutes),
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
