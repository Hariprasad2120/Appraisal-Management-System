import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthStr = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year!, month! - 1, 1);
  const end = new Date(year!, month!, 0);

  const records = await prisma.employeeOt.findMany({
    where: { 
      employeeId: session.user.id,
      attendanceDate: { gte: start, lte: end } 
    },
    include: {
      attendanceLog: {
        select: { checkIn: true, checkOut: true, totalHours: true, regularizationStatus: true }
      }
    },
    orderBy: { attendanceDate: "desc" },
  });

  return NextResponse.json(records);
}
