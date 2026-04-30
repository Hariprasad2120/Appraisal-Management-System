import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, critical: true, dismissed: false },
    orderBy: [{ urgent: "desc" }, { createdAt: "asc" }],
    select: { id: true, type: true, message: true, link: true, createdAt: true, urgent: true, important: true },
  });

  return NextResponse.json(
    notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
  );
}
