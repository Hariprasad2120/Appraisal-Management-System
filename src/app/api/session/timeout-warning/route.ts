import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const secondsLeft = Number(body.secondsLeft);
  const safeSecondsLeft = Number.isFinite(secondsLeft) ? Math.max(0, Math.ceil(secondsLeft)) : 60;
  const recentCutoff = new Date(Date.now() - 2 * 60 * 1000);

  const recentWarning = await prisma.notification.findFirst({
    where: {
      userId: session.user.id,
      type: "SESSION_TIMEOUT_WARNING",
      createdAt: { gte: recentCutoff },
    },
    select: { id: true },
  });

  if (!recentWarning) {
    await prisma.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          userId: session.user.id,
          type: "SESSION_TIMEOUT_WARNING",
          message: `Your session will expire in about ${safeSecondsLeft} seconds due to inactivity.`,
          link: null,
          persistent: true,
          critical: true,
          important: true,
        },
      });

      await tx.securityEvent.create({
        data: {
          userId: session.user.id,
          email: session.user.email ?? null,
          event: "SESSION_ACTIVITY",
          outcome: "SUCCESS",
          ipAddress: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
          sessionToken: session.user.sessionToken,
          details: { activity: "TIMEOUT_WARNING", secondsLeft: safeSecondsLeft },
        },
      });
    });
  }

  return NextResponse.json({ ok: true });
}
