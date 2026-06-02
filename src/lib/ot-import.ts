import { prisma } from "@/lib/db";
import { normalizeToISTMidnight, processMonthOT, upsertAttendanceLogRecord, toDateString } from "@/lib/ot";

type Row = Record<string, unknown>;

type ImportEmployee = {
  id: string;
  name: string;
  email: string;
  employeeNumber: number | null;
};

export type AttendanceImportMapping = {
  employeeNumber?: string;
  employeeName?: string;
  officialEmail?: string;
  attendanceDate: string;
  checkIn?: string;
  checkOut?: string;
  totalHours?: string;
  approvalStatus?: string;
  regularizationStatus?: string;
  remarks?: string;
  permissionMins?: string;
  earlyLeavingMins?: string;
};

export type HolidayImportMapping = {
  holidayDate: string;
  holidayName?: string;
  holidayType?: string;
};

export type LopImportMapping = {
  employeeNumber?: string;
  employeeName?: string;
  officialEmail?: string;
  payrollMonth?: string;
  lopDays: string;
  remarks?: string;
};

export type ImportError = {
  row: number;
  employeeId?: string;
  employeeName?: string;
  reason: string;
  payload: any;
};

export type ImportSummary = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  skippedDetails?: ImportError[];
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalize(value: unknown): string {
  return text(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = text(value).replace(/,/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = text(value);
  if (!raw) return null;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const match = raw.match(/^(\d{1,2})[-/](\w{3}|\d{1,2})[-/](\d{2,4})$/i);
  if (!match) return null;

  const [, dayRaw, monthRaw, yearRaw] = match;
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthIndex = /^\d+$/.test(monthRaw)
    ? Number(monthRaw) - 1
    : monthNames.indexOf(monthRaw.toLowerCase());
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  const day = Number(dayRaw);
  if (monthIndex < 0) return null;
  const date = new Date(year, monthIndex, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMonthStart(value: unknown, fallbackMonth?: string): Date | null {
  const raw = text(value);
  const monthValue = raw || fallbackMonth || "";
  if (!monthValue) return null;

  const yyyyMm = monthValue.match(/^(\d{4})-(\d{2})$/);
  if (yyyyMm) {
    return normalizeToISTMidnight(new Date(Number(yyyyMm[1]), Number(yyyyMm[2]) - 1, 1));
  }

  const parsed = parseDate(monthValue);
  if (!parsed) return null;
  return normalizeToISTMidnight(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseTimeOnDate(date: Date, value: unknown): Date | null {
  const raw = text(value);
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) {
    const full = new Date(raw);
    if (!Number.isNaN(full.getTime())) return full;
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const second = Number(match[3] ?? "0");
  const meridiem = match[4]?.toUpperCase();

  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  // Use IST offset to ensure correct UTC storage
  const dateStr = toDateString(date); 
  const isoStr = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000+05:30`;
  return new Date(isoStr);
}

function fieldValue(row: Row, key?: string): unknown {
  if (!key) return "";
  return row[key];
}

async function getImportEmployees(): Promise<ImportEmployee[]> {
  return prisma.user.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      email: true,
      employeeNumber: true,
    },
    orderBy: { name: "asc" },
  });
}

function matchEmployee(
  row: Row,
  mapping: {
    employeeNumber?: string;
    employeeName?: string;
    officialEmail?: string;
  },
  employees: ImportEmployee[],
): ImportEmployee | null {
  const employeeNumber = parseNumber(fieldValue(row, mapping.employeeNumber));
  const email = normalize(fieldValue(row, mapping.officialEmail));
  const name = normalize(fieldValue(row, mapping.employeeName));

  let matches = employees;

  if (employeeNumber !== null) {
    matches = matches.filter((employee) => employee.employeeNumber === employeeNumber);
  }
  if (email) {
    matches = matches.filter((employee) => normalize(employee.email) === email);
  }
  if (name) {
    matches = matches.filter((employee) => normalize(employee.name) === name);
  }

  if (matches.length === 1) return matches[0];

  if (matches.length === 0) {
    if (employeeNumber !== null) {
      const byNumber = employees.find((employee) => employee.employeeNumber === employeeNumber);
      if (byNumber) return byNumber;
    }
    if (email) {
      const byEmail = employees.find((employee) => normalize(employee.email) === email);
      if (byEmail) return byEmail;
    }
    if (name) {
      const byName = employees.find((employee) => normalize(employee.name) === name);
      if (byName) return byName;
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

function upsertSummary(summary: ImportSummary, action: "imported" | "updated" | "skipped") {
  summary[action] += 1;
}

export async function importAttendanceRows(
  rows: Row[],
  mapping: AttendanceImportMapping,
): Promise<ImportSummary> {
  const summary: ImportSummary = { imported: 0, updated: 0, skipped: 0, errors: [], skippedDetails: [] };
  const employees = await getImportEmployees();
  const affectedMonths = new Set<string>();

  for (const [index, row] of rows.entries()) {
    try {
      const employee = matchEmployee(row, mapping, employees);
      if (!employee) {
        throw new Error("Employee match not found (ID/Name/Email)");
      }

      const rawDate = parseDate(fieldValue(row, mapping.attendanceDate));
      if (!rawDate) {
        throw new Error("Invalid or missing attendance date");
      }
      
      const attendanceDate = normalizeToISTMidnight(rawDate);

      const checkIn = parseTimeOnDate(attendanceDate, fieldValue(row, mapping.checkIn));
      const checkOut = parseTimeOnDate(attendanceDate, fieldValue(row, mapping.checkOut));
      
      if (checkIn && checkOut && checkOut < checkIn) {
        throw new Error("Check-out time is earlier than check-in time");
      }

      const totalHours = parseNumber(fieldValue(row, mapping.totalHours));
      const approvalStatus = text(fieldValue(row, mapping.approvalStatus)) || "Approved";
      const regularizationStatus = text(fieldValue(row, mapping.regularizationStatus)) || null;
      const remarks = text(fieldValue(row, mapping.remarks)) || null;
      const permissionMins = parseNumber(fieldValue(row, mapping.permissionMins)) || 0;
      const earlyLeavingMins = parseNumber(fieldValue(row, mapping.earlyLeavingMins)) || 0;

      const existing = await prisma.attendanceLog.findUnique({
        where: {
          employeeId_attendanceDate: {
            employeeId: employee.id,
            attendanceDate,
          },
        },
        select: { id: true },
      });

      await upsertAttendanceLogRecord(
        {
          employeeId: employee.id,
          attendanceDate,
          checkIn,
          checkOut,
          totalHours,
          approvalStatus,
          regularizationStatus,
          remarks,
          permissionMins,
          earlyLeavingMins,
        },
        { recalculateOt: false },
      );

      affectedMonths.add(formatMonthKey(attendanceDate));
      upsertSummary(summary, existing ? "updated" : "imported");
    } catch (error) {
      upsertSummary(summary, "skipped");
      const reason = error instanceof Error ? error.message : "Import failed";
      summary.errors.push(`Row ${index + 1}: ${reason}`);
      summary.skippedDetails?.push({
        row: index + 1,
        reason,
        payload: row
      });
    }
  }

  for (const monthKey of affectedMonths) {
    const [year, month] = monthKey.split("-").map(Number);
    await processMonthOT(new Date(year, month - 1, 1));
  }

  return summary;
}

const HOLIDAY_TYPES = new Set(["NATIONAL", "COMPANY", "RESTRICTED", "WEEKEND"]);

export async function importHolidayRows(
  rows: Row[],
  mapping: HolidayImportMapping,
): Promise<ImportSummary> {
  const summary: ImportSummary = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    try {
      const holidayDate = parseDate(fieldValue(row, mapping.holidayDate));
      if (!holidayDate) {
        throw new Error("Invalid holiday date");
      }

      const holidayName =
        text(fieldValue(row, mapping.holidayName)) ||
        `Holiday ${holidayDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
      const requestedType = text(fieldValue(row, mapping.holidayType)).toUpperCase();
      const holidayType = HOLIDAY_TYPES.has(requestedType) ? requestedType : "COMPANY";

      const existing = await prisma.holiday.findFirst({
        where: {
          holidayDate,
          holidayType: holidayType as "NATIONAL" | "COMPANY" | "RESTRICTED" | "WEEKEND",
        },
        select: { id: true },
      });

      await prisma.holiday.upsert({
        where: {
          holidayDate_holidayType: {
            holidayDate,
            holidayType: holidayType as "NATIONAL" | "COMPANY" | "RESTRICTED" | "WEEKEND",
          },
        },
        update: {
          holidayName,
        },
        create: {
          holidayDate,
          holidayName,
          holidayType: holidayType as "NATIONAL" | "COMPANY" | "RESTRICTED" | "WEEKEND",
        },
      });

      upsertSummary(summary, existing ? "updated" : "imported");
    } catch (error) {
      upsertSummary(summary, "skipped");
      summary.errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : "Import failed"}`);
    }
  }

  return summary;
}

export async function importLopRows(
  rows: Row[],
  mapping: LopImportMapping,
  fallbackPayrollMonth?: string,
): Promise<ImportSummary> {
  const summary: ImportSummary = { imported: 0, updated: 0, skipped: 0, errors: [] };
  const employees = await getImportEmployees();

  for (const [index, row] of rows.entries()) {
    try {
      const employee = matchEmployee(row, mapping, employees);
      if (!employee) {
        throw new Error("Employee match not found");
      }

      const payrollMonth = parseMonthStart(fieldValue(row, mapping.payrollMonth), fallbackPayrollMonth);
      if (!payrollMonth) {
        throw new Error("Invalid payroll month");
      }

      const lopDays = parseNumber(fieldValue(row, mapping.lopDays));
      if (lopDays === null) {
        throw new Error("Invalid LOP days");
      }

      const remarks = text(fieldValue(row, mapping.remarks)) || null;

      const existing = await prisma.employeeLop.findUnique({
        where: {
          employeeId_payrollMonth: {
            employeeId: employee.id,
            payrollMonth,
          },
        },
        select: { id: true },
      });

      await prisma.employeeLop.upsert({
        where: {
          employeeId_payrollMonth: {
            employeeId: employee.id,
            payrollMonth,
          },
        },
        update: {
          lopDays,
          remarks,
        },
        create: {
          employeeId: employee.id,
          payrollMonth,
          lopDays,
          remarks,
        },
      });

      upsertSummary(summary, existing ? "updated" : "imported");
    } catch (error) {
      upsertSummary(summary, "skipped");
      summary.errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : "Import failed"}`);
    }
  }

  return summary;
}
