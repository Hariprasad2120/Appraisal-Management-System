import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

// POST /api/notifications/retrigger — admin re-sends a notification as urgent
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  const original = await prisma.notification.findFirst({ where: { id: body.id, organizationId } });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Create a new urgent copy for the target user
  const urgent = await prisma.$transaction(async (tx) => {
    const notification = await tx.notification.create({
      data: {
        organizationId,
        userId: original.userId,
        type: original.type,
        message: `[URGENT] ${original.message}`,
        link: original.link,
        persistent: true,
        critical: true,
        important: true,
        urgent: true,
        retriggeredFromId: original.id,
      },
    });
    await tx.messageRetriggerLog.create({
      data: {
        organizationId,
        actorId: session.user.id,
        recipientId: original.userId,
        notificationId: notification.id,
        messageType: original.type,
        channel: "IN_APP",
        metadata: { originalNotificationId: original.id },
      },
    });
    await tx.auditLog.create({
      data: {
        organizationId,
        actorId: session.user.id,
        action: "MESSAGE_RETRIGGERED",
        after: { notificationId: notification.id, originalNotificationId: original.id, recipientId: original.userId, type: original.type },
      },
    });
    return notification;
  });

  return NextResponse.json({ ok: true, id: urgent.id });
}
