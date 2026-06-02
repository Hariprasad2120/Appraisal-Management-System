import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

const editSchema = z.object({
  id: z.string(),
  adjustedOtMins: z.number(),
  earlyLeavingMins: z.number(),
  compOffDays: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Fetch current state for audit
  const before = await prisma.employeeOt.findUnique({ where: { id: parsed.data.id } });

  // Update the DB
  const record = await prisma.employeeOt.update({
    where: { id: parsed.data.id },
    data: {
      adjustedOtMins: parsed.data.adjustedOtMins,
      earlyLeavingMins: parsed.data.earlyLeavingMins,
      compOffDays: parsed.data.compOffDays,
    },
  });

  // Log to Audit
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "MANUAL_OT_ADJUSTMENT",
      before: before as any,
      after: record as any,
    },
  });

  return NextResponse.json(record);
}
