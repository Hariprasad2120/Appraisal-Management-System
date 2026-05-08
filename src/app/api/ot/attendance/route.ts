import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { upsertAttendanceLogRecord } from "@/lib/ot";
import { z } from "zod";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const employeeId = searchParams.get("employeeId");

  const where: Record<string, unknown> = {};
  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.attendanceDate = {
      gte: new Date(y, m - 1, 1),
      lte: new Date(y, m, 0),
    };
  }
  if (employeeId) where.employeeId = employeeId;

  const logs = await prisma.attendanceLog.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, employeeNumber: true, department: true } },
      ot: true,
    },
    orderBy: [{ attendanceDate: "desc" }, { employee: { name: "asc" } }],
    take: 500,
  });

  return NextResponse.json(logs);
}

const logSchema = z.object({
  employeeId: z.string(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  totalHours: z.number().optional(),
  regularizationStatus: z.string().optional(),
  approvalStatus: z.string().default("Approved"),
  remarks: z.string().optional(),
  earlyLeavingMins: z.number().optional(),
  permissionMins: z.number().optional(),
});

const bulkSchema = z.object({
  logs: z.array(logSchema).min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const logs = parsed.data.logs;
  
  // Batch check employee existence
  const uniqueEmpIds = Array.from(new Set(logs.map(l => l.employeeId)));
  const existingEmps = await prisma.user.findMany({
    where: { id: { in: uniqueEmpIds } },
    select: { id: true }
  });
  const existingEmpSet = new Set(existingEmps.map(e => e.id));

  let inserted = 0;
  let skipped = 0;
  const skippedDetails: any[] = [];

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    try {
      if (!existingEmpSet.has(log.employeeId)) {
        throw new Error(`Employee ID "${log.employeeId}" does not exist in the system.`);
      }

      // Time sequence validation
      if (log.checkIn && log.checkOut) {
        const ci = new Date(log.checkIn);
        const co = new Date(log.checkOut);
        if (co < ci) throw new Error("Check-out time is earlier than check-in time.");
      }

      await upsertAttendanceLogRecord({
        employeeId: log.employeeId,
        attendanceDate: new Date(log.attendanceDate),
        checkIn: log.checkIn ? new Date(log.checkIn) : null,
        checkOut: log.checkOut ? new Date(log.checkOut) : null,
        totalHours: log.totalHours ?? null,
        regularizationStatus: log.regularizationStatus ?? null,
        approvalStatus: log.approvalStatus,
        remarks: log.remarks ?? null,
        earlyLeavingMins: log.earlyLeavingMins ?? 0,
        permissionMins: log.permissionMins ?? 0,
      });
      inserted++;
    } catch (e: any) {
      skipped++;
      skippedDetails.push({
        row: i + 1,
        employeeId: log.employeeId,
        reason: e.message || "Prisma or Database error",
        payload: log
      });
    }
  }

  return NextResponse.json({ 
    message: skipped > 0 ? "Import partially completed" : "Import successful",
    inserted, 
    skipped,
    skippedDetails 
  }, { status: 201 });
}
