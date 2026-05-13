import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  const notifications = await prisma.notification.findMany({
    where: { organizationId, userId: session.user.id, critical: true, dismissed: false },
    orderBy: [{ urgent: "desc" }, { createdAt: "asc" }],
    select: { id: true, type: true, message: true, link: true, createdAt: true, urgent: true, important: true },
  });

  return NextResponse.json(
    notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
  );
}
