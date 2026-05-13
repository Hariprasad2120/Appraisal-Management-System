import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

// GET /api/notifications/admin — audit trail for admin panel
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = 50;
  const skip = (page - 1) * limit;
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { organizationId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, role: true, email: true } },
      },
    }),
    prisma.notification.count({ where: { organizationId } }),
  ]);

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      acknowledgedAt: n.acknowledgedAt?.toISOString() ?? null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

// PATCH /api/notifications/admin — mark important
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { id?: string; important?: boolean };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  await prisma.notification.updateMany({
    where: { id: body.id, organizationId },
    data: { important: body.important ?? true },
  });

  return NextResponse.json({ ok: true });
}
