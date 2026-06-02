import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/rbac";

export async function GET() {
  const timeoutSetting = await prisma.systemSetting.findUnique({
    where: { key: "SESSION_TIMEOUT_MINUTES" },
  });
  return NextResponse.json({ timeoutMinutes: timeoutSetting ? parseInt(timeoutSetting.value, 10) : 10 });
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdmin(session.user.role, session.user.secondaryRole)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const minutes = parseInt(body.timeoutMinutes, 10);
  if (isNaN(minutes) || minutes < 1 || minutes > 480) {
    return NextResponse.json({ ok: false, error: "Must be 1–480 minutes" }, { status: 400 });
  }

  const previous = await prisma.systemSetting.findUnique({
    where: { key: "SESSION_TIMEOUT_MINUTES" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.upsert({
      where: { key: "SESSION_TIMEOUT_MINUTES" },
      update: { value: String(minutes), updatedById: session.user.id },
      create: { key: "SESSION_TIMEOUT_MINUTES", value: String(minutes), updatedById: session.user.id },
    });

    await tx.securityEvent.create({
      data: {
        userId: session.user.id,
        email: session.user.email ?? null,
        event: "SESSION_SETTING_UPDATED",
        outcome: "SUCCESS",
        ipAddress: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
        sessionToken: session.user.sessionToken,
        details: {
          setting: "SESSION_TIMEOUT_MINUTES",
          before: previous?.value ?? null,
          after: String(minutes),
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
