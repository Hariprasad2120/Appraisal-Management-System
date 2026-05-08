/**
 * OT and comp-off calculation engine with advanced rules for early leaving, penalties, and grace periods.
 */

import { prisma } from "@/lib/db";
import { calendarFromDb } from "@/lib/working-hours";

export interface CompOffSlab {
  minHours: number;
  compOffDays: number;
}

export const DEFAULT_COMPOFF_SLABS: CompOffSlab[] = [
  { minHours: 2, compOffDays: 0.5 },
  { minHours: 4, compOffDays: 1 },
];

export const DEFAULT_OT_SETTINGS = {
  standardHoursPerDay: 8,
  otRatePerHour: 100,
  compOffSlabs: DEFAULT_COMPOFF_SLABS,
  graceMinutes: 15,
  requiresWorkReport: false,
};

type AttendanceLogForOt = {
  id: string;
  employeeId: string;
  attendanceDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  totalHours: unknown;
  approvalStatus: string;
  regularizationStatus: string | null;
  earlyLeavingMins: number;
  permissionMins: number;
  employee: {
    id: string;
    currentSalary: unknown;
    salary: { grossAnnum: unknown } | null;
  };
};

type OtMonthContext = {
  settings: typeof DEFAULT_OT_SETTINGS;
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
  earlyLeavingMins: number;
  regularizedPenaltyMins: number;
  permissionMins: number;
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
  earlyLeavingMins?: number;
  permissionMins?: number;
};

export function calculateHours(checkIn: Date, checkOut: Date): number {
  if (!checkIn || !checkOut) return 0;
  const diff = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  return Math.max(0, Number(diff.toFixed(2)));
}

export function isWeekend(date: Date): boolean {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
}

export function toDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function normalizeToISTMidnight(date: Date): Date {
  const dateStr = toDateString(date);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0));
}

export function getAllDatesInMonth(year: number, month: number): Date[] {
  // Construct a date at 12:00 PM IST on the 1st of the month
  // Note: Date constructor uses 0-based month (0-11)
  const lastDay = new Date(year, month, 0).getDate();
  const dates = [];
  for (let d = 1; d <= lastDay; d++) {
    // We create a date object that we'll normalize
    dates.push(normalizeToISTMidnight(new Date(year, month - 1, d)));
  }
  return dates;
}

export function getSaturdayNumber(date: Date): number {
  const dateStr = toDateString(date);
  const [y, m, d] = dateStr.split("-").map(Number);
  const istDate = new Date(y!, m! - 1, d!);
  
  if (istDate.getDay() !== 6) return 0;
  return Math.ceil(istDate.getDate() / 7);
}

export function isSunday(date: Date): boolean {
  const dateStr = toDateString(date);
  const [y, m, d] = dateStr.split("-").map(Number);
  const istDate = new Date(y!, m! - 1, d!);
  return istDate.getDay() === 0;
}

export function isFirstOrThirdSaturday(date: Date): boolean {
  const num = getSaturdayNumber(date);
  return num === 1 || num === 3 || num === 5;
}

export function isSecondOrFourthSaturday(date: Date): boolean {
  const num = getSaturdayNumber(date);
  return num === 2 || num === 4;
}

export function getDayType(date: Date, holidayDateSet: Set<string>): "WORKING_DAY" | "HOLIDAY" | "WEEKEND" | "SUNDAY" {
  const dateStr = toDateString(date);
  if (holidayDateSet.has(dateStr)) return "HOLIDAY";
  
  const [y, m, d] = dateStr.split("-").map(Number);
  const istDate = new Date(y!, m! - 1, d!);
  const day = istDate.getDay();
  
  if (day === 0) return "SUNDAY";
  if (day === 6) {
    const num = Math.ceil(istDate.getDate() / 7);
    if (num === 2 || num === 4) return "WEEKEND";
    return "WORKING_DAY"; // 1st, 3rd, 5th are working
  }
  
  return "WORKING_DAY";
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

export async function getOtSettings(): Promise<typeof DEFAULT_OT_SETTINGS> {
  const settings = await prisma.otSettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    return { ...DEFAULT_OT_SETTINGS };
  }

  return {
    standardHoursPerDay: Number(settings.standardHoursPerDay),
    otRatePerHour: Number(settings.otRatePerHour),
    compOffSlabs: (settings.compOffSlabs as CompOffSlab[] | null) ?? DEFAULT_COMPOFF_SLABS,
    graceMinutes: settings.graceMinutes ?? 15,
    requiresWorkReport: settings.requiresWorkReport ?? false,
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

function resolveEmployeeOtRatePerMinute(
  employee: AttendanceLogForOt["employee"],
  attendanceDate: Date,
  context: OtMonthContext,
): number {
  const fallbackMinuteRate = context.settings.otRatePerHour / 60;
  const annualSalary = getAnnualSalary(employee);
  if (!annualSalary) {
    return fallbackMinuteRate;
  }

  const workingDays = countWorkingDaysInMonth(
    attendanceDate,
    context.workingDays,
    context.holidayDateSet,
  );
  
  const standardMonthlyHours = workingDays * context.settings.standardHoursPerDay;
  if (standardMonthlyHours <= 0) {
    return fallbackMinuteRate;
  }

  const monthlyGross = annualSalary / 12;
  const hourlyRate = monthlyGross / standardMonthlyHours;
  return hourlyRate / 60;
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
  // If no work was done, we don't generate an OT record via this flow, 
  // but wait, the user wants all days visible. The API will handle missing days.
  if (!log.checkIn || !log.checkOut || hoursWorked <= 0) return null;

  const dayTypeStr = getDayType(new Date(log.attendanceDate), context.holidayDateSet);
  const otRatePerMinute = resolveEmployeeOtRatePerMinute(log.employee, log.attendanceDate, context);

  let dayType: OtComputation["dayType"] = "WORKING_DAY";
  if (dayTypeStr === "HOLIDAY") dayType = "HOLIDAY";
  else if (dayTypeStr === "WEEKEND" || dayTypeStr === "SUNDAY") dayType = "WEEKEND";

  const minutesWorked = Math.round(hoursWorked * 60);
  const standardMinutes = Math.round(context.settings.standardHoursPerDay * 60);
  const permissionMinutes = log.permissionMins || 0;
  const requiredMinutes = Math.max(0, standardMinutes - permissionMinutes);
  
  let otMins = 0;
  let earlyLeavingMins = 0;
  let regularizedPenaltyMins = 0;
  let otAmount = 0;
  let compOffDays = 0;

  const isRegularized = !!log.regularizationStatus && String(log.regularizationStatus).trim() !== '';

  if (dayType === "HOLIDAY" || dayType === "WEEKEND") {
    // NON-WORKING DAY: Comp Off Logic
    if (minutesWorked > 0) {
      const applicableSlabs = context.settings.compOffSlabs
        .filter((s) => (minutesWorked / 60) >= s.minHours)
        .sort((a, b) => b.minHours - a.minHours);

      if (applicableSlabs.length > 0) {
        compOffDays = applicableSlabs[0].compOffDays;
      }

      if (isRegularized && compOffDays > 0) {
        // Regularized penalty of 75% on compOff
        const penalty = compOffDays * 0.75;
        compOffDays = compOffDays - penalty;
      }
    }
    // OT is NOT calculated on non-working days
  } else {
    // WORKING DAY: OT Logic
    if (minutesWorked < requiredMinutes) {
      earlyLeavingMins = requiredMinutes - minutesWorked;
    } else if (minutesWorked >= requiredMinutes + context.settings.graceMinutes) {
      // Overtime calculation starts strictly AFTER the grace period
      otMins = minutesWorked - (requiredMinutes + context.settings.graceMinutes);
    }

    if (isRegularized && otMins > 0) {
      regularizedPenaltyMins = Math.floor(otMins * 0.75);
      otMins = otMins - regularizedPenaltyMins;
    }

    otAmount = Number((otMins * otRatePerMinute).toFixed(2));
    // Comp Off is NOT calculated on working days
  }

  return {
    dayType,
    hoursWorked: Number(hoursWorked.toFixed(2)),
    otHours: Number((otMins / 60).toFixed(2)), 
    otRatePerHour: Number((otRatePerMinute * 60).toFixed(2)),
    otAmount,
    compOffDays,
    earlyLeavingMins,
    regularizedPenaltyMins,
    permissionMins: permissionMinutes,
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
      earlyLeavingMins: computed.earlyLeavingMins,
      regularizedPenaltyMins: computed.regularizedPenaltyMins,
      permissionMins: computed.permissionMins,
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
      earlyLeavingMins: computed.earlyLeavingMins,
      regularizedPenaltyMins: computed.regularizedPenaltyMins,
      permissionMins: computed.permissionMins,
      approvalStatus: "PENDING",
      tlApprovalStatus: "PENDING",
      managerApprovalStatus: "PENDING",
      hrApprovalStatus: "PENDING",
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
  return syncEmployeeOtForLogRecord(log as AttendanceLogForOt, context);
}

export async function upsertAttendanceLogRecord(
  input: AttendanceLogUpsertInput,
  options?: { recalculateOt?: boolean },
) {
  const attendanceDate = normalizeToISTMidnight(new Date(input.attendanceDate));
  const totalHours = deriveAttendanceTotalHours(input);

  const record = await prisma.attendanceLog.upsert({
    where: {
      employeeId_attendanceDate: {
        employeeId: input.employeeId,
        attendanceDate: attendanceDate,
      },
    },
    update: {
      checkIn: input.checkIn ?? null,
      checkOut: input.checkOut ?? null,
      totalHours,
      regularizationStatus: input.regularizationStatus ?? null,
      approvalStatus: input.approvalStatus ?? "Approved",
      remarks: input.remarks ?? null,
      earlyLeavingMins: input.earlyLeavingMins ?? 0,
      permissionMins: input.permissionMins ?? 0,
    },
    create: {
      employeeId: input.employeeId,
      attendanceDate: attendanceDate,
      checkIn: input.checkIn ?? null,
      checkOut: input.checkOut ?? null,
      totalHours,
      regularizationStatus: input.regularizationStatus ?? null,
      approvalStatus: input.approvalStatus ?? "Approved",
      remarks: input.remarks ?? null,
      earlyLeavingMins: input.earlyLeavingMins ?? 0,
      permissionMins: input.permissionMins ?? 0,
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
  const monthStart = normalizeToISTMidnight(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
  const monthEnd = normalizeToISTMidnight(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
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
    // Note: Future integration step: if context.settings.requiresWorkReport is true, check if report exists
    const synced = await syncEmployeeOtForLogRecord(log as AttendanceLogForOt, context);
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
