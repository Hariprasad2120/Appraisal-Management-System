import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  await prisma.notification.updateMany({
    where: { organizationId, id: body.id, userId: session.user.id },
    data: { dismissed: true, read: true },
  });

  return NextResponse.json({ ok: true });
}
