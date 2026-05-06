import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

const approveSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await prisma.employeeOt.updateMany({
    where: { id: { in: parsed.data.ids } },
    data: {
      approvalStatus: "APPROVED",
      approvedById: session.user.id,
      approvedAt: new Date(),
      rejectionRemarks: null,
    },
  });

  return NextResponse.json({ updated: result.count });
}
