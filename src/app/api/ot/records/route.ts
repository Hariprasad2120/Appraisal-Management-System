import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllDatesInMonth, toDateString, getDayType } from "@/lib/ot";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "YYYY-MM"
  const employeeId = searchParams.get("employeeId");

  if (!month) return NextResponse.json({ error: "Month required" }, { status: 400 });

  const [year, monthNum] = month.split("-").map(Number);
  const monthStart = new Date(year, monthNum - 1, 1);
  const monthEnd = new Date(year, monthNum, 0);

  // 1. Get all dates in month
  const allDates = getAllDatesInMonth(year, monthNum);

  // 2. Fetch data
  const [employees, otRecords, logs, holidays] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, ...(employeeId ? { id: employeeId } : {}) },
      select: { id: true, name: true, employeeNumber: true, department: true }
    }),
    prisma.employeeOt.findMany({
      where: {
        attendanceDate: { gte: monthStart, lte: monthEnd },
        ...(employeeId ? { employeeId } : {})
      }
    }),
    prisma.attendanceLog.findMany({
      where: {
        attendanceDate: { gte: monthStart, lte: monthEnd },
        ...(employeeId ? { employeeId } : {})
      }
    }),
    prisma.holiday.findMany({
      where: { holidayDate: { gte: monthStart, lte: monthEnd } }
    })
  ]);

  const holidayDateSet = new Set(holidays.map(h => toDateString(new Date(h.holidayDate))));
  const holidayMap = new Map(holidays.map(h => [toDateString(new Date(h.holidayDate)), h.holidayName]));

  // 3. Merge and generate full list
  const results = [];

  for (const emp of employees) {
    const empOt = otRecords.filter(r => r.employeeId === emp.id);
    const empLogs = logs.filter(l => l.employeeId === emp.id);

    for (const date of allDates) {
      const dateStr = toDateString(date);
      const ot = empOt.find(r => toDateString(new Date(r.attendanceDate)) === dateStr);
      const log = empLogs.find(l => toDateString(new Date(l.attendanceDate)) === dateStr);
      
      const dayType = getDayType(date, holidayDateSet);
      
      // Detailed Label Generation
      let label = "Working Day";
      const [y, m, d] = dateStr.split("-").map(Number);
      const istDate = new Date(y!, m! - 1, d!);
      const dayOfWeek = istDate.getDay();
      
      if (dayType === "HOLIDAY") {
        label = holidayMap.get(dateStr) || "Company Holiday";
      } else if (dayOfWeek === 0) {
        label = "Sunday - Weekly Off";
      } else if (dayOfWeek === 6) {
        const satNum = Math.ceil(istDate.getDate() / 7);
        const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd", 4: "th", 5: "th" };
        const suffix = suffixes[satNum] || "th";
        const isWorking = satNum === 1 || satNum === 3 || satNum === 5;
        label = `${satNum}${suffix} Saturday ${isWorking ? "Working" : "Holiday"}`;
      }

      results.push({
        id: ot?.id || `temp-${emp.id}-${dateStr}`,
        employee: emp,
        attendanceDate: dateStr,
        dayType: dayType, // Returns WORKING_DAY, HOLIDAY, WEEKEND, SUNDAY
        dayLabel: label,
        holidayName: holidayMap.get(dateStr) || null,
        hoursWorked: Number(ot?.hoursWorked || 0),
        otHours: Number(ot?.otHours || 0),
        otAmount: Number(ot?.otAmount || 0),
        compOffDays: Number(ot?.compOffDays || 0),
        earlyLeavingMins: ot?.earlyLeavingMins || 0,
        regularizedPenaltyMins: ot?.regularizedPenaltyMins || 0,
        adjustedOtMins: ot?.adjustedOtMins || 0,
        approvalStatus: ot?.approvalStatus || "N/A",
        hrApprovalStatus: ot?.hrApprovalStatus || "N/A",
        // Additional info for UI
        checkIn: log?.checkIn || null,
        checkOut: log?.checkOut || null,
        hasAttendance: !!log,
      });
    }
  }

  return NextResponse.json(results);
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // For Demo Purposes: Reset OT Management
  await prisma.employeeOt.deleteMany({});
  await prisma.attendanceLog.deleteMany({});
  
  return NextResponse.json({ message: "All OT and Attendance records have been reset." });
}
