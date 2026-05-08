import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  // We only show records that have been forwarded by HR (hrApprovalStatus = 'APPROVED').
  // A TL sees their direct reports (where user.reportingToId === session.user.id).
  // A Manager sees the reports of the TLs they manage (user.managerId === session.user.id).

  const where: any = {
    hrApprovalStatus: "APPROVED",
  };

  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.attendanceDate = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0) };
  }

  // We need to fetch records where the employee is either directly reporting to this user,
  // or indirectly reporting (this user is the manager).
  const records = await prisma.employeeOt.findMany({
    where: {
      ...where,
      employee: {
        OR: [
          { reportingManagerId: session.user.id },
          { reportingManager: { reportingManagerId: session.user.id } },
        ]
      }
    },
    include: {
      employee: {
        select: {
          id: true, name: true, employeeNumber: true, department: true, reportingManagerId: true, reportingManager: { select: { reportingManagerId: true } }
        }
      }
    },
    orderBy: [{ attendanceDate: "desc" }, { employee: { name: "asc" } }],
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.ids || !Array.isArray(body.ids)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const action = body.action; // 'APPROVE' | 'REJECT'
  
  // To verify they can approve, we fetch the records first.
  const records = await prisma.employeeOt.findMany({
    where: { id: { in: body.ids } },
    include: { employee: true }
  });

  const tlIdsToApprove: string[] = [];
  const managerIdsToApprove: string[] = [];

  for (const r of records) {
    if (r.employee.reportingManagerId === session.user.id) tlIdsToApprove.push(r.id);
    else managerIdsToApprove.push(r.id);
  }

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  let updated = 0;

  if (tlIdsToApprove.length > 0) {
    const res = await prisma.employeeOt.updateMany({
      where: { id: { in: tlIdsToApprove } },
      data: { tlApprovalStatus: newStatus }
    });
    updated += res.count;
  }

  if (managerIdsToApprove.length > 0) {
    const res = await prisma.employeeOt.updateMany({
      where: { id: { in: managerIdsToApprove } },
      data: { managerApprovalStatus: newStatus }
    });
    updated += res.count;
  }
  
  // If a manager rejects, should we reject entirely? For now, we update the specific status.
  // The global approvalStatus could be tied to this, but admin/HR manages global.
  // If tl and manager approve, the record is good. If rejected, it stays rejected.

  return NextResponse.json({ updated });
}
