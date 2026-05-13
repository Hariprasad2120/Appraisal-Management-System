"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import { getSystemDate } from "@/lib/system-date";

type Result = { ok: true } | { ok: false; error: string };

async function assertAdmin(): Promise<{ id: string } | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findFirst({
    where: {
      active: true,
      OR: [
        { id: session.user.id },
        ...(session.user.email ? [{ email: session.user.email }] : []),
      ],
    },
    select: { id: true, role: true, secondaryRole: true },
  });

  if (!user || (user.role !== "ADMIN" && user.secondaryRole !== "ADMIN")) return null;
  return { id: user.id };
}

/** Shift all active cycle deadlines by N days (positive = forward, negative = backward). */
export async function shiftDeadlinesAction(days: number): Promise<Result> {
  const actor = await assertAdmin();
  if (!actor) return { ok: false, error: "Forbidden" };
  if (days === 0 || Math.abs(days) > 30) return { ok: false, error: "Days must be 1â€“30" };

  const activeCycles = await prisma.appraisalCycle.findMany({
    where: { status: { notIn: ["DECIDED", "CLOSED"] } },
    include: { self: true },
  });

  const ms = days * 24 * 60 * 60 * 1000;

  await prisma.$transaction(async (tx) => {
    for (const cycle of activeCycles) {
      const updates: Record<string, Date | null> = {};
      if (cycle.ratingDeadline) updates.ratingDeadline = new Date(cycle.ratingDeadline.getTime() + ms);
      if (cycle.tentativeDate1) updates.tentativeDate1 = new Date(cycle.tentativeDate1.getTime() + ms);
      if (cycle.tentativeDate2) updates.tentativeDate2 = new Date(cycle.tentativeDate2.getTime() + ms);
      if (cycle.scheduledDate) updates.scheduledDate = new Date(cycle.scheduledDate.getTime() + ms);

      if (Object.keys(updates).length > 0) {
        await tx.appraisalCycle.update({ where: { id: cycle.id }, data: updates });
      }

      if (cycle.self?.editableUntil) {
        await tx.selfAssessment.update({
          where: { cycleId: cycle.id },
          data: { editableUntil: new Date(cycle.self.editableUntil.getTime() + ms) },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "SIMULATION_TIME_SHIFT",
        after: { days, affectedCycles: activeCycles.length, shiftedAt: new Date().toISOString() },
      },
    });

    // Record simulation mode active
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "SIMULATION_MODE",
        after: { active: true, lastShift: days },
      },
    });
  });

  // After shifting, check for SCHEDULED cycles whose meeting date has now arrived
  const now = await getSystemDate();
  const meetingArrivedCycles = await prisma.appraisalCycle.findMany({
    where: {
      status: "SCHEDULED",
      scheduledDate: { lte: now },
    },
    include: {
      user: { select: { id: true, name: true } },
      assignments: { select: { reviewerId: true } },
    },
  });

  for (const cycle of meetingArrivedCycles) {
    // Avoid duplicate meeting-day notifications
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        type: "MEETING_DAY",
        link: `/admin/mom/${cycle.id}`,
      },
    });
    if (alreadyNotified) continue;

    const [adminUsers, managementUsers, hrUsers] = await Promise.all([
      prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
      prisma.user.findMany({ where: { role: "MANAGEMENT", active: true }, select: { id: true } }),
      prisma.user.findMany({ where: { role: "HR", active: true }, select: { id: true } }),
    ]);
    const meetingNotifyIds = [...new Set([
      ...adminUsers.map((u) => u.id),
      ...managementUsers.map((u) => u.id),
      ...hrUsers.map((u) => u.id),
    ])];
    const dateStr = cycle.scheduledDate!.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    await Promise.all(
      meetingNotifyIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            type: "MEETING_DAY",
            message: `Today is the scheduled appraisal meeting date for ${cycle.user.name} (${dateStr}). MOM window is now open.`,
            link: `/admin/mom/${cycle.id}`,
            persistent: true,
            critical: true,
          },
        })
      )
    );
  }

  revalidatePath("/appraisal/simulation");
  revalidatePath("/admin");
  revalidatePath("/appraisal");
  return { ok: true };
}

/** Extend a specific cycle's rating deadline by N days. */
export async function extendCycleDeadlineAction(cycleId: string, days: number): Promise<Result> {
  const actor = await assertAdmin();
  if (!actor) return { ok: false, error: "Forbidden" };
  if (days < 1 || days > 14) return { ok: false, error: "Extension must be 1â€“14 days" };

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) return { ok: false, error: "Cycle not found" };

  const base = cycle.ratingDeadline ?? new Date();
  const newDeadline = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.appraisalCycle.update({ where: { id: cycleId }, data: { ratingDeadline: newDeadline } });
    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: actor.id,
        action: "DEADLINE_EXTENDED",
        before: { ratingDeadline: cycle.ratingDeadline?.toISOString() },
        after: { ratingDeadline: newDeadline.toISOString(), extendedByDays: days },
      },
    });
    // Notify all reviewers of the extension
    const assignments = await tx.cycleAssignment.findMany({
      where: { cycleId },
      select: { reviewerId: true },
    });
    await Promise.all(
      assignments.map((a) =>
        tx.notification.create({
          data: {
            userId: a.reviewerId,
            type: "EXTENSION_APPROVED",
            message: `Rating deadline extended by ${days} day${days !== 1 ? "s" : ""}. New deadline: ${newDeadline.toLocaleDateString("en-IN")}`,
            link: `/reviewer/${cycleId}`,
            persistent: true,
            critical: false,
          },
        })
      )
    );
  });

  revalidatePath("/appraisal/simulation");
  return { ok: true };
}

/** Clear simulation mode flag in audit log. */
export async function clearSimulationModeAction(): Promise<Result> {
  const actor = await assertAdmin();
  if (!actor) return { ok: false, error: "Forbidden" };

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "SIMULATION_MODE",
      after: { active: false },
    },
  });

  revalidatePath("/appraisal/simulation");
  return { ok: true };
}

/** Set a global system date override for testing. All "now" checks use this date. */
export async function setSystemDateAction(isoDate: string): Promise<Result> {
  const actor = await assertAdmin();
  if (!actor) return { ok: false, error: "Forbidden" };

  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return { ok: false, error: "Invalid date" };

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "SYSTEM_DATE_OVERRIDE",
      after: { date: d.toISOString(), active: true },
    },
  });

  // Check if any SCHEDULED cycle's meeting date has arrived at the new system date
  const meetingArrivedOnSet = await prisma.appraisalCycle.findMany({
    where: { status: "SCHEDULED", scheduledDate: { lte: d } },
    include: { user: { select: { id: true, name: true } } },
  });

  for (const cycle of meetingArrivedOnSet) {
    const alreadyNotified = await prisma.notification.findFirst({
      where: { type: "MEETING_DAY", link: `/admin/mom/${cycle.id}` },
    });
    if (alreadyNotified) continue;

    const [adminUsers, managementUsers, hrUsers] = await Promise.all([
      prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
      prisma.user.findMany({ where: { role: "MANAGEMENT", active: true }, select: { id: true } }),
      prisma.user.findMany({ where: { role: "HR", active: true }, select: { id: true } }),
    ]);
    const meetingNotifyIds = [...new Set([
      ...adminUsers.map((u) => u.id),
      ...managementUsers.map((u) => u.id),
      ...hrUsers.map((u) => u.id),
    ])];
    const dateStr = cycle.scheduledDate!.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    await Promise.all(
      meetingNotifyIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            type: "MEETING_DAY",
            message: `Today is the scheduled appraisal meeting date for ${cycle.user.name} (${dateStr}). MOM window is now open.`,
            link: `/admin/mom/${cycle.id}`,
            persistent: true,
            critical: true,
          },
        })
      )
    );
  }

  revalidatePath("/appraisal/simulation");
  revalidatePath("/");
  return { ok: true };
}

/** Clear system date override â€” system returns to real time. */
export async function clearSystemDateAction(): Promise<Result> {
  const actor = await assertAdmin();
  if (!actor) return { ok: false, error: "Forbidden" };

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "SYSTEM_DATE_OVERRIDE",
      after: { active: false },
    },
  });

  revalidatePath("/appraisal/simulation");
  revalidatePath("/");
  return { ok: true };
}

/** Delete ALL appraisal cycle data. Dev/testing only. Admin-gated. */
export async function deleteAllCyclesAction(): Promise<Result & { deleted?: number }> {
  const actor = await assertAdmin();
  if (!actor) return { ok: false, error: "Forbidden" };

  const count = await prisma.appraisalCycle.count();

  await prisma.$transaction(async (tx) => {
    // AuditLogs referencing cycles must be unlinked first (no cascade on cycleId)
    await tx.auditLog.updateMany({
      where: { cycleId: { not: null } },
      data: { cycleId: null },
    });

    await tx.appraisalCycle.deleteMany({});

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "DEV_RESET_ALL_CYCLES",
        after: { deletedCount: count, deletedAt: new Date().toISOString() },
      },
    });
  });

  revalidatePath("/appraisal/cycles");
  revalidatePath("/appraisal/simulation");
  revalidatePath("/admin");
  revalidatePath("/appraisal");
  revalidatePath("/appraisal");

  return { ok: true, deleted: count };
}

