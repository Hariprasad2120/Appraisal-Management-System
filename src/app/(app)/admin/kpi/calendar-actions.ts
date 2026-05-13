"use server";

import { revalidatePath } from "next/cache";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")
  ) {
    throw new Error("Forbidden");
  }
  return session;
}

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function parseTimeString(value: string, fieldName: string): void {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must be in HH:MM format`);
  }
}

export async function saveWorkingCalendarAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();

  const workStartTime = text(formData, "workStartTime") || "10:00";
  const workEndTime = text(formData, "workEndTime") || "17:30";
  const timezone = text(formData, "timezone") || "Asia/Kolkata";
  const graceMinutesRaw = text(formData, "graceMinutes");
  const graceMinutes = parseInt(graceMinutesRaw || "30", 10);

  parseTimeString(workStartTime, "Work start time");
  parseTimeString(workEndTime, "Work end time");
  if (!Number.isInteger(graceMinutes) || graceMinutes < 0 || graceMinutes > 120)
    throw new Error("Grace minutes must be 0–120");

  // Working days: checkboxes named "workingDay" with values 0-6
  const workingDaysRaw = formData.getAll("workingDay");
  const workingDays = workingDaysRaw
    .filter((v): v is string => typeof v === "string")
    .map(Number)
    .filter((n) => n >= 0 && n <= 6)
    .sort();
  if (workingDays.length === 0) throw new Error("Select at least one working day");

  // Breaks: comma-separated pairs "HH:MM-HH:MM"
  const breaksRaw = text(formData, "breaks");
  const breaks: Array<{ start: string; end: string }> = [];
  if (breaksRaw) {
    for (const pair of breaksRaw.split(",").map((s) => s.trim()).filter(Boolean)) {
      const [start, end] = pair.split("-").map((s) => s.trim());
      if (!start || !end) throw new Error(`Invalid break entry: "${pair}". Use HH:MM-HH:MM format`);
      parseTimeString(start, "Break start");
      parseTimeString(end, "Break end");
      breaks.push({ start, end });
    }
  }

  // Holidays: newline-separated ISO date strings
  const holidaysRaw = text(formData, "holidays");
  const holidays: string[] = [];
  if (holidaysRaw) {
    for (const line of holidaysRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(line)) {
        throw new Error(`Holiday "${line}" must be in YYYY-MM-DD format`);
      }
      holidays.push(line);
    }
  }

  await prisma.workingCalendar.upsert({
    where: { id: "default" },
    create: {
      workStartTime,
      workEndTime,
      timezone,
      graceMinutes,
      workingDays,
      breaks,
      holidays,
      updatedById: session.user.id,
    },
    update: {
      workStartTime,
      workEndTime,
      timezone,
      graceMinutes,
      workingDays,
      breaks,
      holidays,
      updatedById: session.user.id,
    },
  });

  revalidatePath("/admin/kpi");
}
