/**
 * Working-hours utilities.
 * Pure functions — no DB calls.
 * Used by the KPI task timer to count only valid working minutes.
 */

export type WorkingCalendarConfig = {
  workStartTime: string; // "HH:MM" 24-h
  workEndTime: string; // "HH:MM" 24-h
  timezone: string; // IANA timezone string
  graceMinutes: number;
  workingDays: number[]; // 0=Sun … 6=Sat
  breaks: Array<{ start: string; end: string }>; // "HH:MM" pairs
  holidays: string[]; // "YYYY-MM-DD" ISO dates
};

const DEFAULT_CALENDAR: WorkingCalendarConfig = {
  workStartTime: "10:00",
  workEndTime: "17:30",
  timezone: "Asia/Kolkata",
  graceMinutes: 30,
  workingDays: [1, 2, 3, 4, 5, 6],
  breaks: [{ start: "13:00", end: "14:00" }],
  holidays: [],
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function isoDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function timezoneOffsetMs(date: Date, timezone: string): number {
  const p = zonedParts(date, timezone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(dateKey: string, hhmm: string, timezone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  let utc = new Date(Date.UTC(year!, month! - 1, day!, hour ?? 0, minute ?? 0, 0));
  utc = new Date(utc.getTime() - timezoneOffsetMs(utc, timezone));
  return new Date(Date.UTC(year!, month! - 1, day!, hour ?? 0, minute ?? 0, 0) - timezoneOffsetMs(utc, timezone));
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + days));
  return next.toISOString().slice(0, 10);
}

function dateKeyDayOfWeek(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
}

function isWorkingDate(dateKey: string, calendar: WorkingCalendarConfig): boolean {
  if (calendar.holidays.includes(dateKey)) return false;
  const dayOfWeek = dateKeyDayOfWeek(dateKey);
  
  // Custom logic for Adarsh Shipping: 1st and 3rd Saturdays are working, others are holidays.
  if (dayOfWeek === 6) {
    const dayOfMonth = Number(dateKey.split("-")[2]);
    const weekOfMonth = Math.ceil(dayOfMonth / 7);
    // Only 1st and 3rd Saturdays are working days.
    return weekOfMonth === 1 || weekOfMonth === 3;
  }
  
  return calendar.workingDays.includes(dayOfWeek);
}

/** Minutes of valid working time within a single day for a given start–end window (in minutes-since-midnight). */
function workingMinutesInWindow(
  dayStart: number,
  dayEnd: number,
  windowStart: number,
  windowEnd: number,
  breaks: Array<{ start: string; end: string }>,
): number {
  const start = Math.max(dayStart, windowStart);
  const end = Math.min(dayEnd, windowEnd);
  if (end <= start) return 0;
  let minutes = end - start;

  for (const brk of breaks) {
    const bs = toMinutes(brk.start);
    const be = toMinutes(brk.end);
    const overlapStart = Math.max(start, bs);
    const overlapEnd = Math.min(end, be);
    if (overlapEnd > overlapStart) {
      minutes -= overlapEnd - overlapStart;
    }
  }
  return Math.max(0, minutes);
}

/**
 * Count working minutes between two Date objects.
 * Only counts time that falls within working hours on working days (excluding holidays and breaks).
 */
export function countWorkingMinutes(
  from: Date,
  to: Date,
  calendar: WorkingCalendarConfig = DEFAULT_CALENDAR,
): number {
  if (to <= from) return 0;

  const dayStartMin = toMinutes(calendar.workStartTime);
  const dayEndMin = toMinutes(calendar.workEndTime);

  let total = 0;
  let cursorKey = isoDate(from, calendar.timezone);
  const endKey = isoDate(to, calendar.timezone);

  while (cursorKey <= endKey) {
    if (isWorkingDate(cursorKey, calendar)) {
      const startOfDay = zonedDateTimeToUtc(cursorKey, calendar.workStartTime, calendar.timezone);
      const endOfDay = zonedDateTimeToUtc(cursorKey, calendar.workEndTime, calendar.timezone);

      const windowStart = Math.max(from.getTime(), startOfDay.getTime());
      const windowEnd = Math.min(to.getTime(), endOfDay.getTime());

      if (windowEnd > windowStart) {
        const wsParts = zonedParts(new Date(windowStart), calendar.timezone);
        const weParts = zonedParts(new Date(windowEnd), calendar.timezone);
        const wsMin = wsParts.hour * 60 + wsParts.minute;
        const weMin = weParts.hour * 60 + weParts.minute;
        total += workingMinutesInWindow(dayStartMin, dayEndMin, wsMin, weMin, calendar.breaks);
      }
    }

    cursorKey = addDays(cursorKey, 1);
  }

  return total;
}

/**
 * Check if a given Date falls within a working period (working day + working hours, not on break).
 */
export function isWorkingTime(
  date: Date,
  calendar: WorkingCalendarConfig = DEFAULT_CALENDAR,
): boolean {
  const todayStr = isoDate(date, calendar.timezone);
  if (!isWorkingDate(todayStr, calendar)) return false;

  const parts = zonedParts(date, calendar.timezone);
  const minuteOfDay = parts.hour * 60 + parts.minute;

  const dayStart = toMinutes(calendar.workStartTime);
  const dayEnd = toMinutes(calendar.workEndTime);
  if (minuteOfDay < dayStart || minuteOfDay >= dayEnd) return false;

  for (const brk of calendar.breaks) {
    const bs = toMinutes(brk.start);
    const be = toMinutes(brk.end);
    if (minuteOfDay >= bs && minuteOfDay < be) return false;
  }
  return true;
}

/**
 * Build a WorkingCalendarConfig from the DB record (which stores Json fields).
 * Falls back to DEFAULT_CALENDAR for any missing fields.
 */
export function calendarFromDb(record: {
  workStartTime: string;
  workEndTime: string;
  timezone: string;
  graceMinutes: number;
  workingDays: unknown;
  breaks: unknown;
  holidays: unknown;
} | null): WorkingCalendarConfig {
  if (!record) return DEFAULT_CALENDAR;
  return {
    workStartTime: record.workStartTime,
    workEndTime: record.workEndTime,
    timezone: record.timezone,
    graceMinutes: record.graceMinutes,
    workingDays: Array.isArray(record.workingDays)
      ? (record.workingDays as number[])
      : DEFAULT_CALENDAR.workingDays,
    breaks: Array.isArray(record.breaks)
      ? (record.breaks as Array<{ start: string; end: string }>)
      : DEFAULT_CALENDAR.breaks,
    holidays: Array.isArray(record.holidays)
      ? (record.holidays as string[])
      : DEFAULT_CALENDAR.holidays,
  };
}
