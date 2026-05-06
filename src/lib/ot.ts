/**
 * OT and comp-off calculation engine.
 */

import { prisma } from "@/lib/db";
import { calendarFromDb } from "@/lib/working-hours";

export interface CompOffSlab {
  minHours: number;
  compOffDays: number;
}

export const DEFAULT_COMPOFF_SLABS: CompOffSlab[] = [
  { minHours: 4, compOffDays: 0.5 },
  { minHours: 8, compOffDays: 1 },
  { minHours: 11, compOffDays: 1.5 },
];

export const DEFAULT_OT_SETTINGS = {
  standardHoursPerDay: 8,
  otRatePerHour: 100,
  compOffSlabs: DEFAULT_COMPOFF_SLABS,
};

type AttendanceLogForOt = {
  id: string;
  employeeId: string;
  attendanceDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  totalHours: unknown;
  approvalStatus: string;
  employee: {
    id: string;
    currentSalary: unknown;
    salary: { grossAnnum: unknown } | null;
  };
};

type OtMonthContext = {
  settings: {
    standardHoursPerDay: number;
    otRatePerHour: number;
    compOffSlabs: CompOffSlab[];
  };
  holidayDateSet: Set<string>;
  workingDays: number[];
};

type OtComputation = {
  dayType: "WORKING_DAY" | "HOLIDAY" | "WEEKEND";
  hoursWorked: number;
  otHours: number;
  otRatePerHour: number;
  otAmount: number;
  compOffDays: number;
};

export type AttendanceLogUpsertInput = {
  employeeId: string;
  attendanceDate: Date;
  checkIn?: Date | null;
  checkOut?: Date | null;
  totalHours?: number | null;
  regularizationStatus?: string | null;
  approvalStatus?: string;
  remarks?: string | null;
};

export function calculateHours(checkIn: Date, checkOut: Date): number {
  if (!checkIn || !checkOut) return 0;
  const diff = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  return Math.max(0, Number(diff.toFixed(2)));
}

export function calculateOT(hoursWorked: number, standardHours: number): number {
  if (hoursWorked <= standardHours) return 0;
  return Number((hoursWorked - standardHours).toFixed(2));
}

export function calculateCompOff(
  hoursWorked: number,
  slabs: CompOffSlab[] = DEFAULT_COMPOFF_SLABS,
): number {
  const sorted = [...slabs].sort((a, b) => b.minHours - a.minHours);
  for (const slab of sorted) {
    if (hoursWorked >= slab.minHours) return slab.compOffDays;
  }
  return 0;
}

export function isWeekend(date: Date): boolean {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
}

export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function isApprovedAttendanceStatus(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toLowerCase() === "approved";
}

export function deriveAttendanceTotalHours(input: {
  checkIn?: Date | null;
  checkOut?: Date | null;
  totalHours?: number | null;
}): number | null {
  if (input.checkIn && input.checkOut) {
    return calculateHours(input.checkIn, input.checkOut);
  }
  if (typeof input.totalHours === "number" && Number.isFinite(input.totalHours)) {
    return Number(input.totalHours.toFixed(2));
  }
  return null;
}

export async function getOtSettings() {
  const settings = await prisma.otSettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    return {
      standardHoursPerDay: DEFAULT_OT_SETTINGS.standardHoursPerDay,
      otRatePerHour: DEFAULT_OT_SETTINGS.otRatePerHour,
      compOffSlabs: DEFAULT_OT_SETTINGS.compOffSlabs as CompOffSlab[],
    };
  }

  return {
    standardHoursPerDay: Number(settings.standardHoursPerDay),
    otRatePerHour: Number(settings.otRatePerHour),
    compOffSlabs: (settings.compOffSlabs as CompOffSlab[] | null) ?? DEFAULT_COMPOFF_SLABS,
  };
}

function countWorkingDaysInMonth(
  date: Date,
  workingDays: number[],
  holidayDateSet: Set<string>,
): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let total = 0;

  for (let day = 1; day <= lastDay; day++) {
    const current = new Date(year, month, day);
    const dateKey = toDateString(current);
    if (!workingDays.includes(current.getDay())) continue;
    if (holidayDateSet.has(dateKey)) continue;
    total++;
  }

  return total;
}

function getAnnualSalary(employee: AttendanceLogForOt["employee"]): number | null {
  const salary = employee.salary?.grossAnnum ?? employee.currentSalary;
  const value = Number(salary ?? NaN);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolveEmployeeOtRate(
  employee: AttendanceLogForOt["employee"],
  attendanceDate: Date,
  context: OtMonthContext,
): number {
  const annualSalary = getAnnualSalary(employee);
  if (!annualSalary) {
    return context.settings.otRatePerHour;
  }

  const workingDays = countWorkingDaysInMonth(
    attendanceDate,
    context.workingDays,
    context.holidayDateSet,
  );
  const standardMonthlyHours = workingDays * context.settings.standardHoursPerDay;
  if (standardMonthlyHours <= 0) {
    return context.settings.otRatePerHour;
  }

  const monthlyGross = annualSalary / 12;
  return Number((monthlyGross / standardMonthlyHours).toFixed(2));
}

function computeOtForLog(
  log: AttendanceLogForOt,
  context: OtMonthContext,
): OtComputation | null {
  const hoursWorked =
    log.totalHours !== null && log.totalHours !== undefined
      ? Number(log.totalHours)
      : log.checkIn && log.checkOut
        ? calculateHours(log.checkIn, log.checkOut)
        : 0;

  if (!isApprovedAttendanceStatus(log.approvalStatus)) return null;
  if (!log.checkIn || !log.checkOut || hoursWorked <= 0) return null;

  const dateStr = toDateString(new Date(log.attendanceDate));
  const holiday = context.holidayDateSet.has(dateStr);
  const weekend = isWeekend(new Date(log.attendanceDate));
  const otRatePerHour = resolveEmployeeOtRate(log.employee, log.attendanceDate, context);

  let dayType: OtComputation["dayType"] = "WORKING_DAY";
  let otHours = 0;
  let otAmount = 0;
  let compOffDays = 0;

  if (holiday) dayType = "HOLIDAY";
  else if (weekend) dayType = "WEEKEND";

  if (holiday || weekend) {
    compOffDays = calculateCompOff(hoursWorked, context.settings.compOffSlabs);
  } else {
    otHours = calculateOT(hoursWorked, context.settings.standardHoursPerDay);
    otAmount = Number((otHours * otRatePerHour).toFixed(2));
  }

  return {
    dayType,
    hoursWorked: Number(hoursWorked.toFixed(2)),
    otHours,
    otRatePerHour,
    otAmount,
    compOffDays,
  };
}

async function getOtMonthContext(monthDate: Date): Promise<OtMonthContext> {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  const [settings, calendarRecord, holidays] = await Promise.all([
    getOtSettings(),
    prisma.workingCalendar.findUnique({ where: { id: "default" } }),
    prisma.holiday.findMany({
      where: {
        holidayDate: { gte: monthStart, lte: monthEnd },
      },
      select: { holidayDate: true },
    }),
  ]);

  const calendar = calendarFromDb(calendarRecord);

  return {
    settings,
    workingDays: Array.isArray(calendar.workingDays) && calendar.workingDays.length > 0
      ? calendar.workingDays
      : [1, 2, 3, 4, 5, 6],
    holidayDateSet: new Set(holidays.map((holiday) => toDateString(new Date(holiday.holidayDate)))),
  };
}

async function syncEmployeeOtForLogRecord(log: AttendanceLogForOt, context: OtMonthContext) {
  const computed = computeOtForLog(log, context);

  if (!computed) {
    await prisma.employeeOt.deleteMany({
      where: { attendanceLogId: log.id },
    });
    return false;
  }

  await prisma.employeeOt.upsert({
    where: { attendanceLogId: log.id },
    update: {
      dayType: computed.dayType,
      hoursWorked: computed.hoursWorked,
      otHours: computed.otHours,
      otRatePerHour: computed.otRatePerHour,
      otAmount: computed.otAmount,
      compOffDays: computed.compOffDays,
    },
    create: {
      attendanceLogId: log.id,
      employeeId: log.employeeId,
      attendanceDate: log.attendanceDate,
      dayType: computed.dayType,
      hoursWorked: computed.hoursWorked,
      otHours: computed.otHours,
      otRatePerHour: computed.otRatePerHour,
      otAmount: computed.otAmount,
      compOffDays: computed.compOffDays,
      approvalStatus: "PENDING",
    },
  });

  return true;
}

export async function syncEmployeeOtForAttendanceLog(attendanceLogId: string) {
  const log = await prisma.attendanceLog.findUnique({
    where: { id: attendanceLogId },
    include: {
      employee: {
        select: {
          id: true,
          currentSalary: true,
          salary: { select: { grossAnnum: true } },
        },
      },
    },
  });

  if (!log) return false;

  const context = await getOtMonthContext(log.attendanceDate);
  return syncEmployeeOtForLogRecord(log, context);
}

export async function upsertAttendanceLogRecord(
  input: AttendanceLogUpsertInput,
  options?: { recalculateOt?: boolean },
) {
  const totalHours = deriveAttendanceTotalHours(input);

  const record = await prisma.attendanceLog.upsert({
    where: {
      employeeId_attendanceDate: {
        employeeId: input.employeeId,
        attendanceDate: input.attendanceDate,
      },
    },
    update: {
      checkIn: input.checkIn ?? null,
      checkOut: input.checkOut ?? null,
      totalHours,
      regularizationStatus: input.regularizationStatus ?? null,
      approvalStatus: input.approvalStatus ?? "Approved",
      remarks: input.remarks ?? null,
    },
    create: {
      employeeId: input.employeeId,
      attendanceDate: input.attendanceDate,
      checkIn: input.checkIn ?? null,
      checkOut: input.checkOut ?? null,
      totalHours,
      regularizationStatus: input.regularizationStatus ?? null,
      approvalStatus: input.approvalStatus ?? "Approved",
      remarks: input.remarks ?? null,
    },
  });

  if (options?.recalculateOt !== false) {
    await syncEmployeeOtForAttendanceLog(record.id);
  }

  return record;
}

export async function processMonthOT(monthDate: Date): Promise<{
  processed: number;
  skipped: number;
}> {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const context = await getOtMonthContext(monthDate);

  const logs = await prisma.attendanceLog.findMany({
    where: {
      attendanceDate: { gte: monthStart, lte: monthEnd },
    },
    include: {
      employee: {
        select: {
          id: true,
          currentSalary: true,
          salary: { select: { grossAnnum: true } },
        },
      },
    },
  });

  let processed = 0;
  let skipped = 0;

  for (const log of logs) {
    const synced = await syncEmployeeOtForLogRecord(log, context);
    if (synced) processed++;
    else skipped++;
  }

  return { processed, skipped };
}

export interface PayrollSummaryRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: number | null;
  department: string | null;
  totalOtHours: number;
  totalOtAmount: number;
  totalCompOffDays: number;
  lopDays: number;
}

export async function generatePayrollSummary(
  monthDate: Date,
): Promise<PayrollSummaryRow[]> {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  const [otRecords, lopRecords] = await Promise.all([
    prisma.employeeOt.findMany({
      where: {
        attendanceDate: { gte: monthStart, lte: monthEnd },
        approvalStatus: "APPROVED",
      },
      include: {
        employee: {
          select: { id: true, name: true, employeeNumber: true, department: true },
        },
      },
    }),
    prisma.employeeLop.findMany({
      where: { payrollMonth: monthStart },
      include: {
        employee: {
          select: { id: true, name: true, employeeNumber: true, department: true },
        },
      },
    }),
  ]);

  const payrollMap = new Map<string, PayrollSummaryRow>();

  for (const ot of otRecords) {
    const existing = payrollMap.get(ot.employeeId) ?? {
      employeeId: ot.employeeId,
      employeeName: ot.employee.name,
      employeeNumber: ot.employee.employeeNumber,
      department: ot.employee.department,
      totalOtHours: 0,
      totalOtAmount: 0,
      totalCompOffDays: 0,
      lopDays: 0,
    };

    existing.totalOtHours += Number(ot.otHours);
    existing.totalOtAmount += Number(ot.otAmount);
    existing.totalCompOffDays += Number(ot.compOffDays);
    payrollMap.set(ot.employeeId, existing);
  }

  for (const lop of lopRecords) {
    const existing = payrollMap.get(lop.employeeId) ?? {
      employeeId: lop.employeeId,
      employeeName: lop.employee.name,
      employeeNumber: lop.employee.employeeNumber,
      department: lop.employee.department,
      totalOtHours: 0,
      totalOtAmount: 0,
      totalCompOffDays: 0,
      lopDays: 0,
    };
    existing.lopDays += Number(lop.lopDays);
    payrollMap.set(lop.employeeId, existing);
  }

  return [...payrollMap.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName),
  );
}
