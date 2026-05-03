import { addDays, isWeekend } from "date-fns";

export function addBusinessDays(date: Date, days: number): Date {
  let d = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    d = addDays(d, 1);
    if (!isWeekend(d)) remaining -= 1;
  }
  return d;
}

/** Returns end-of-day (23:59:59.999) of N business days from date. */
export function selfAssessmentDeadline(from: Date, businessDays = 3): Date {
  const d = addBusinessDays(from, businessDays);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isAnniversaryInMonth(joiningDate: Date, ref: Date): boolean {
  return joiningDate.getMonth() === ref.getMonth();
}

export function daysUntilAnniversary(joiningDate: Date, ref: Date): number {
  const next = new Date(ref.getFullYear(), joiningDate.getMonth(), joiningDate.getDate());
  if (next < ref) next.setFullYear(next.getFullYear() + 1);
  return Math.ceil((next.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isDateReached(date: Date, ref: Date = new Date()): boolean {
  return startOfLocalDay(ref) >= startOfLocalDay(date);
}
