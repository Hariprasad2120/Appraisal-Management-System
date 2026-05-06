import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

const rejectSchema = z.object({
  id: z.string(),
  remarks: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.employeeOt.update({
    where: { id: parsed.data.id },
    data: {
      approvalStatus: "REJECTED",
      rejectionRemarks: parsed.data.remarks,
      approvedById: null,
      approvedAt: null,
    },
  });

  return NextResponse.json({ success: true });
}
