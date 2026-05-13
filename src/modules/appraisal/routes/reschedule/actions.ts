"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import { isAdmin, isManagement } from "@/lib/rbac";

type Result = { ok: true } | { ok: false; error: string };

const rescheduleSchema = z.object({
  cycleId: z.string(),
  newDate: z.string().datetime(),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(1000),
});

/** HR or Management can request a reschedule when the meeting was missed or needs to move. */
export async function requestRescheduleAction(input: z.infer<typeof rescheduleSchema>): Promise<Result> {
  const session = await auth();
  const role = session?.user?.role;
  const secondary = session?.user?.secondaryRole;
  const canReschedule =
    role === "MANAGEMENT" || secondary === "MANAGEMENT" || role === "HR" || secondary === "HR" || isAdmin(role!, secondary);
  if (!session?.user || !canReschedule) return { ok: false, error: "Forbidden" };

  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { cycleId, newDate, reason } = parsed.data;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      user: true,
      assignments: { select: { reviewerId: true } },
    },
  });
  if (!cycle) return { ok: false, error: "Cycle not found" };
  if (!cycle.scheduledDate) return { ok: false, error: "No meeting scheduled for this cycle" };
  if (!["SCHEDULED", "DECIDED"].includes(cycle.status)) {
    return { ok: false, error: "Can only reschedule a cycle in SCHEDULED or DECIDED status" };
  }

  const newDateObj = new Date(newDate);
  if (newDateObj <= new Date()) return { ok: false, error: "New date must be in the future" };
  if (cycle.scheduledDate && newDateObj.toDateString() === cycle.scheduledDate.toDateString()) {
    return { ok: false, error: "New date must differ from current scheduled date" };
  }

  await prisma.$transaction(async (tx) => {
    const originalDate = cycle.scheduledDate!;

    await tx.meetingReschedule.create({
      data: {
        cycleId,
        originalDate,
        newDate: newDateObj,
        reason,
        rescheduledById: session.user.id,
        status: "PENDING",
      },
    });

    // Update cycle with new scheduled date, keep status SCHEDULED
    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: { scheduledDate: newDateObj },
    });

    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "MEETING_RESCHEDULED",
        before: { scheduledDate: originalDate.toISOString() },
        after: { scheduledDate: newDateObj.toISOString(), reason },
      },
    });

    const actor = await tx.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    const actorName = actor?.name ?? "HR/Management";
    const newDateStr = newDateObj.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    // Notify: appraisee, all reviewers, all admins, all management
    const [adminUsers, managementUsers] = await Promise.all([
      tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
      tx.user.findMany({ where: { role: "MANAGEMENT", active: true }, select: { id: true } }),
    ]);

    const notifyIds = new Set<string>([
      cycle.userId,
      ...cycle.assignments.map((a) => a.reviewerId),
      ...adminUsers.map((u) => u.id),
      ...managementUsers.map((u) => u.id),
    ]);

    const buildMessage = (uid: string) => {
      const isEmployee = uid === cycle.userId;
      const who = isEmployee ? "Your" : `${cycle.user.name}'s`;
      return `${who} appraisal meeting has been rescheduled by ${actorName}. New date: ${newDateStr}. Reason: ${reason}`;
    };

    const buildLink = (uid: string) => {
      if (uid === cycle.userId) return "/appraisal";
      if (adminUsers.some((u) => u.id === uid)) return `/admin/mom/${cycleId}`;
      if (managementUsers.some((u) => u.id === uid)) return `/management/decide/${cycleId}`;
      return `/reviewer/${cycleId}`;
    };

    await Promise.all(
      [...notifyIds].map((uid) =>
        tx.notification.create({
          data: {
            userId: uid,
            type: "MEETING_RESCHEDULED",
            message: buildMessage(uid),
            link: buildLink(uid),
            persistent: true,
            critical: true,
          },
        })
      )
    );
  });

  revalidatePath(`/management/decide/${cycleId}`);
  revalidatePath(`/management/reschedule`);
  revalidatePath(`/reviewer/${cycleId}`);
  revalidatePath("/appraisal");
  return { ok: true };
}

/** List cycles where meeting date has passed but MOM not recorded (missed meetings). */
export async function getMissedMeetingsAction(): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      cycles: Array<{
        id: string;
        scheduledDate: Date;
        user: { name: string; id: string };
        status: string;
      }>;
    }
> {
  const session = await auth();
  if (!session?.user || !isManagement(session.user.role, session.user.secondaryRole)) {
    return { ok: false, error: "Forbidden" };
  }

  const now = new Date();
  const cycles = await prisma.appraisalCycle.findMany({
    where: {
      status: "SCHEDULED",
      scheduledDate: { lt: now },
      moms: { none: { role: "MANAGEMENT" } },
    },
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      user: { select: { name: true, id: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  return {
    ok: true,
    cycles: cycles.map((c) => ({
      ...c,
      scheduledDate: c.scheduledDate!,
    })),
  };
}

