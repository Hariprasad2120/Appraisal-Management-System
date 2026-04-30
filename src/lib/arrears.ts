import { addDays, differenceInCalendarDays } from "date-fns";

export const ARREAR_BUFFER_DAYS = 7;

/**
 * Returns true if the cycle qualifies for arrear compensation.
 * Eligibility: meeting is scheduled more than ARREAR_BUFFER_DAYS after self-assessment submission.
 */
export function isArrearEligible(selfSubmittedAt: Date, scheduledDate: Date): boolean {
  const bufferEnd = addDays(selfSubmittedAt, ARREAR_BUFFER_DAYS);
  return scheduledDate > bufferEnd;
}

/**
 * Period start = selfSubmittedAt + 7 days
 * Period end   = scheduledDate
 * Returns null when not eligible.
 */
export function computeArrearPeriod(
  selfSubmittedAt: Date,
  scheduledDate: Date,
): { periodFrom: Date; periodTo: Date; arrearDays: number } | null {
  const periodFrom = addDays(selfSubmittedAt, ARREAR_BUFFER_DAYS);
  const periodTo = scheduledDate;
  const arrearDays = differenceInCalendarDays(periodTo, periodFrom);
  if (arrearDays <= 0) return null;
  return { periodFrom, periodTo, arrearDays };
}

/**
 * Daily rate = annual increment / 365
 * Arrear amount = dailyRate * arrearDays
 */
export function computeArrearAmount(
  annualIncrement: number,
  arrearDays: number,
): { dailyRate: number; arrearAmount: number } {
  const dailyRate = annualIncrement / 365;
  const arrearAmount = Math.round(dailyRate * arrearDays * 100) / 100;
  return { dailyRate, arrearAmount };
}
