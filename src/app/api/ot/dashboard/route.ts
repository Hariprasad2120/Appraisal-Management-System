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
  const monthStr = searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year!, month! - 1, 1);
  const end = new Date(year!, month!, 0);

  const [records, pendingCount, deptStats] = await Promise.all([
    prisma.employeeOt.findMany({
      where: { attendanceDate: { gte: start, lte: end }, approvalStatus: "APPROVED" },
      include: { employee: { select: { department: true, name: true } } },
    }),
    prisma.employeeOt.count({
      where: { approvalStatus: "PENDING" },
    }),
    prisma.user.groupBy({
      by: ["department"],
      _count: { id: true },
    }),
  ]);

  // Aggregate stats
  const totalCost = records.reduce((sum, r) => sum + Number(r.otAmount), 0);
  const totalHours = records.reduce((sum, r) => sum + Number(r.otHours), 0);
  const totalCompOff = records.reduce((sum, r) => sum + Number(r.compOffDays), 0);

  // Leaderboard
  const leaderMap = new Map<string, { name: string; amount: number; hours: number }>();
  for (const r of records) {
    const existing = leaderMap.get(r.employeeId) || { name: r.employee.name, amount: 0, hours: 0 };
    existing.amount += Number(r.otAmount);
    existing.hours += Number(r.otHours);
    leaderMap.set(r.employeeId, existing);
  }
  const leaderboard = [...leaderMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Dept distribution
  const deptMap = new Map<string, number>();
  for (const r of records) {
    const dept = r.employee.department || "Other";
    deptMap.set(dept, (deptMap.get(dept) || 0) + Number(r.otAmount));
  }
  const departmentCost = [...deptMap.entries()].map(([name, cost]) => ({ name, cost }));

  return NextResponse.json({
    summary: {
      totalCost,
      totalHours,
      totalCompOff,
      pendingCount,
    },
    leaderboard,
    departmentCost,
  });
}
