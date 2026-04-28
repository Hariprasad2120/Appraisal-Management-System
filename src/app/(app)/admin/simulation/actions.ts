"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

async function assertAdmin(): Promise<{ id: string } | null> {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN") return null;
  return { id: session.user.id };
}

/** Shift all active cycle deadlines by N days (positive = forward, negative = backward). */
export async function shiftDeadlinesAction(days: number): Promise<Result> {
  const actor = await assertAdmin();
  if (!actor) return { ok: false, error: "Forbidden" };
  if (days === 0 || Math.abs(days) > 30) return { ok: false, error: "Days must be 1–30" };

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

  revalidatePath("/admin/simulation");
  revalidatePath("/admin");
  revalidatePath("/management");
  return { ok: true };
}

/** Extend a specific cycle's rating deadline by N days. */
export async function extendCycleDeadlineAction(cycleId: string, days: number): Promise<Result> {
  const actor = await assertAdmin();
  if (!actor) return { ok: false, error: "Forbidden" };
  if (days < 1 || days > 14) return { ok: false, error: "Extension must be 1–14 days" };

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
          },
        })
      )
    );
  });

  revalidatePath("/admin/simulation");
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

  revalidatePath("/admin/simulation");
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

  revalidatePath("/admin/simulation");
  revalidatePath("/");
  return { ok: true };
}

/** Clear system date override — system returns to real time. */
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

  revalidatePath("/admin/simulation");
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

  revalidatePath("/admin/cycles");
  revalidatePath("/admin/simulation");
  revalidatePath("/admin");
  revalidatePath("/management");
  revalidatePath("/reviewer");

  return { ok: true, deleted: count };
}
