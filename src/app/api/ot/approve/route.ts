import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

const approveSchema = z.object({
  ids: z.array(z.string()).min(1),
  forceApprove: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // If forceApprove is true, we skip TL and Manager entirely.
  // If forceApprove is false/undefined, we just mark HR as having approved the base records,
  // which opens it up for the TL to approve.
  const dataToUpdate: any = {
    hrApprovalStatus: "APPROVED",
    approvedById: session.user.id,
    approvedAt: new Date(),
    rejectionRemarks: null,
  };

  if (parsed.data.forceApprove) {
    dataToUpdate.approvalStatus = "APPROVED";
    dataToUpdate.tlApprovalStatus = "APPROVED";
    dataToUpdate.managerApprovalStatus = "APPROVED";
  }

  const result = await prisma.employeeOt.updateMany({
    where: { id: { in: parsed.data.ids } },
    data: dataToUpdate,
  });

  // Log to Audit
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: parsed.data.forceApprove ? "BULK_FORCE_APPROVE_OT" : "BULK_FORWARD_OT",
      after: { ids: parsed.data.ids, updated: result.count } as any,
    },
  });

  // Notifications
  const affectedRecords = await prisma.employeeOt.findMany({
    where: { id: { in: parsed.data.ids } },
    select: { employeeId: true, attendanceDate: true, approvalStatus: true }
  });

  if (parsed.data.forceApprove) {
    await Promise.all(affectedRecords.map(r => 
      prisma.notification.create({
        data: {
          userId: r.employeeId,
          type: "OT_APPROVED",
          message: `Your OT/Comp-Off for ${new Date(r.attendanceDate).toLocaleDateString()} has been approved.`,
          link: "/employee/ot",
        }
      })
    ));
  } else {
    // Forwarded to Team - notify TL/Managers if needed (but usually they check the portal)
    // For now, notify employee that it's moved to team review
    await Promise.all(affectedRecords.map(r => 
      prisma.notification.create({
        data: {
          userId: r.employeeId,
          type: "OT_FORWARDED",
          message: `Your OT/Comp-Off for ${new Date(r.attendanceDate).toLocaleDateString()} has been forwarded to your manager for review.`,
          link: "/employee/ot",
        }
      })
    ));
  }

  return NextResponse.json({ updated: result.count });
}
