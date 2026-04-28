"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

const proposeSchema = z.object({
  cycleId: z.string(),
  date1: z.string().min(1),
  date2: z.string().min(1),
});

export async function proposeTentativeDatesAction(input: z.infer<typeof proposeSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || !["MANAGEMENT", "ADMIN"].includes(session.user.role)) {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = proposeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { cycleId, date1, date2 } = parsed.data;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return { ok: false, error: "Invalid date" };
  if (d1.toDateString() === d2.toDateString()) return { ok: false, error: "Pick two different dates" };

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { assignments: { select: { reviewerId: true } } },
  });
  if (!cycle) return { ok: false, error: "Cycle not found" };

  await prisma.$transaction(async (tx) => {
    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: {
        tentativeDate1: d1,
        tentativeDate2: d2,
        status: "DATE_VOTING",
      },
    });
    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "MEETING_DATES_PROPOSED",
        after: { date1: d1.toISOString(), date2: d2.toISOString() },
      },
    });

    // Notify admin + HR + assigned reviewers
    const [adminUsers, hrUsers] = await Promise.all([
      tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
      tx.user.findMany({ where: { role: "HR", active: true }, select: { id: true } }),
    ]);
    const reviewerIds = cycle.assignments.map((a) => a.reviewerId);
    const notifyIds = [...new Set([...adminUsers.map((u) => u.id), ...hrUsers.map((u) => u.id), ...reviewerIds])];
    await Promise.all(
      notifyIds.map((userId) =>
        tx.notification.create({
          data: {
            userId,
            type: "MEETING_TENTATIVE_DATES",
            message: `Tentative meeting dates proposed. HR will confirm the final date.`,
            link: `/management/vote/${cycleId}`,
            persistent: true,
          },
        }),
      ),
    );
  });

  revalidatePath(`/management/vote/${cycleId}`);
  return { ok: true };
}

const finalizeSchema = z.object({ cycleId: z.string(), finalDate: z.string().min(1) });

export async function finalizeMeetingDateAction(input: z.infer<typeof finalizeSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role) && session.user.secondaryRole !== "HR" && session.user.secondaryRole !== "ADMIN") {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = finalizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { cycleId, finalDate } = parsed.data;
  const d = new Date(finalDate);
  if (isNaN(d.getTime())) return { ok: false, error: "Invalid date" };

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { assignments: { select: { reviewerId: true } } },
  });
  if (!cycle) return { ok: false, error: "Cycle not found" };

  const allowed = [cycle.tentativeDate1, cycle.tentativeDate2].filter(Boolean).some((td) => td && new Date(td).toDateString() === d.toDateString());
  if (!allowed) return { ok: false, error: "Final date must be one of the proposed tentative dates" };

  await prisma.$transaction(async (tx) => {
    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: { scheduledDate: d, status: "SCHEDULED" },
    });
    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "MEETING_DATE_FINALIZED",
        after: { scheduledDate: d.toISOString() },
      },
    });

    // Notify employee + reviewers + management
    const managementUsers = await tx.user.findMany({ where: { role: "MANAGEMENT", active: true }, select: { id: true } });
    const reviewerIds = cycle.assignments.map((a) => a.reviewerId);
    const notifyIds = [...new Set([cycle.userId, ...reviewerIds, ...managementUsers.map((u) => u.id)])];
    await Promise.all(
      notifyIds.map((userId) =>
        tx.notification.create({
          data: {
            userId,
            type: "MEETING_DATE_FINAL",
            message: `Appraisal meeting date finalized: ${d.toLocaleDateString("en-IN")}`,
            link: userId === cycle.userId ? "/employee" : `/management/vote/${cycleId}`,
            persistent: true,
          },
        }),
      ),
    );
  });

  revalidatePath(`/management/vote/${cycleId}`);
  revalidatePath("/management");
  revalidatePath("/employee");
  return { ok: true };
}
