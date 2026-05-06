import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const status = searchParams.get("status");
  const employeeId = searchParams.get("employeeId");

  const where: Record<string, unknown> = {};
  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.attendanceDate = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0) };
  }
  if (status) where.approvalStatus = status;
  if (employeeId) where.employeeId = employeeId;

  const records = await prisma.employeeOt.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, employeeNumber: true, department: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ attendanceDate: "desc" }, { employee: { name: "asc" } }],
    take: 1000,
  });

  return NextResponse.json(records);
}
