"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getSalaryTier } from "@/lib/criteria";

function addBusinessDays(from: Date, days: number): Date {
  let count = 0;
  const d = new Date(from);
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d;
}

const tentativeDatesSchema = z.object({
  cycleId: z.string(),
  tentativeDate1: z.string().datetime(),
  tentativeDate2: z.string().datetime(),
});

export async function submitTentativeDatesAction(
  input: z.infer<typeof tentativeDatesSchema>,
): Promise<Result> {
  const session = await auth();
  if (!session?.user || !["MANAGEMENT", "ADMIN"].includes(session.user.role)) {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = tentativeDatesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { cycleId, tentativeDate1, tentativeDate2 } = parsed.data;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { decision: true, user: true },
  });
  if (!cycle) return { ok: false, error: "Cycle not found" };
  if (!cycle.decision) return { ok: false, error: "Decision not yet made" };

  const decidedAt = cycle.decision.decidedAt;
  const deadline = addBusinessDays(decidedAt, 30);
  const d1 = new Date(tentativeDate1);
  const d2 = new Date(tentativeDate2);

  if (d1 > deadline || d2 > deadline) {
    return { ok: false, error: `Both dates must be within 30 business days of the decision (by ${deadline.toLocaleDateString("en-IN")})` };
  }
  if (d1.toDateString() === d2.toDateString()) {
    return { ok: false, error: "Tentative dates must be different" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: { tentativeDate1: d1, tentativeDate2: d2, status: "DATE_VOTING" },
    });

    // Notify HR reviewers of this cycle to pick from tentative dates
    const hrAssignments = await tx.cycleAssignment.findMany({
      where: { cycleId, role: "HR" },
      select: { reviewerId: true },
    });
    const mgmtUser = await tx.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    const d1Str = d1.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const d2Str = d2.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    await Promise.all(
      hrAssignments.map((a) =>
        tx.notification.create({
          data: {
            userId: a.reviewerId,
            type: "TENTATIVE_DATES_SET",
            message: `${mgmtUser?.name ?? "Management"} has proposed 2 tentative appraisal dates for ${cycle.user.name}: ${d1Str} or ${d2Str}. Please select the confirmed date.`,
            link: `/reviewer/${cycleId}/schedule`,
            persistent: true,
          },
        })
      )
    );

    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "TENTATIVE_DATES_SET",
        after: { tentativeDate1, tentativeDate2 },
      },
    });
  });

  revalidatePath(`/management/decide/${cycleId}`);
  return { ok: true };
}

const hrScheduleSchema = z.object({
  cycleId: z.string(),
  selectedDate: z.string().datetime(),
  notificationMessage: z.string().min(1).max(2000),
});

export async function hrSelectScheduledDateAction(
  input: z.infer<typeof hrScheduleSchema>,
): Promise<Result> {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role)) {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = hrScheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { cycleId, selectedDate, notificationMessage } = parsed.data;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { user: true, assignments: { select: { reviewerId: true } } },
  });
  if (!cycle) return { ok: false, error: "Cycle not found" };

  const chosen = new Date(selectedDate);
  const t1 = cycle.tentativeDate1;
  const t2 = cycle.tentativeDate2;
  if (!t1 || !t2) return { ok: false, error: "No tentative dates set yet" };

  const isT1 = t1.toDateString() === chosen.toDateString();
  const isT2 = t2.toDateString() === chosen.toDateString();
  if (!isT1 && !isT2) {
    return { ok: false, error: "Selected date must be one of the proposed tentative dates" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: { scheduledDate: chosen, status: "SCHEDULED" },
    });

    // Notify: admins + concerned management user (claimedById only) + appraisee
    const adminUsers = await tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
    const notifyIds = new Set<string>([
      ...adminUsers.map((u) => u.id),
      cycle.userId, // appraisee
    ]);
    // Only notify the specific management user who claimed this cycle
    if (cycle.claimedById) notifyIds.add(cycle.claimedById);

    await Promise.all(
      [...notifyIds].map((userId) =>
        tx.notification.create({
          data: {
            userId,
            type: "APPRAISAL_SCHEDULED",
            message: notificationMessage,
            link: userId === cycle.userId ? "/employee" : `/management/decide/${cycleId}`,
            persistent: true,
          },
        })
      )
    );

    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "APPRAISAL_SCHEDULED",
        after: { scheduledDate: selectedDate, notificationMessage },
      },
    });
  });

  revalidatePath(`/reviewer/${cycleId}/schedule`);
  revalidatePath(`/management/decide/${cycleId}`);
  revalidatePath("/reviewer");
  return { ok: true };
}

const schema = z.object({
  cycleId: z.string(),
  finalRating: z.number().min(0).max(100),
  hikePercent: z.number().min(0).max(100),
  slabId: z.string().optional(),
  comments: z.string().optional(),
  managementScores: z.record(z.string(), z.number()).optional(),
  managementComment: z.string().optional(),
  tentativeDate1: z.string().optional(),
  tentativeDate2: z.string().optional(),
});

type Result = { ok: true } | { ok: false; error: string };

export async function claimAppraisalAction(cycleId: string): Promise<Result> {
  const session = await auth();
  if (!session?.user || !["MANAGEMENT", "ADMIN"].includes(session.user.role)) {
    return { ok: false, error: "Forbidden" };
  }
  if (!cycleId) return { ok: false, error: "Invalid cycle" };

  try {
    const res = await prisma.$transaction(async (tx) => {
      const cycle = await tx.appraisalCycle.findUnique({
        where: { id: cycleId },
        select: { id: true, claimedById: true, status: true, userId: true },
      });
      if (!cycle) return { ok: false as const, error: "Cycle not found" };
      if (cycle.status !== "MANAGEMENT_REVIEW" && cycle.status !== "RATINGS_COMPLETE") {
        return { ok: false as const, error: "Appraisal is not ready for management review" };
      }

      if (cycle.claimedById && cycle.claimedById !== session.user.id && session.user.role !== "ADMIN") {
        return { ok: false as const, error: "Already claimed by another management user" };
      }

      if (!cycle.claimedById) {
        await tx.appraisalCycle.update({
          where: { id: cycleId },
          data: { claimedById: session.user.id, claimedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            cycleId,
            actorId: session.user.id,
            action: "MANAGEMENT_CLAIM",
            after: { claimedById: session.user.id },
          },
        });

        // Notify admins + management users
        const [adminUsers, managementUsers] = await Promise.all([
          tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
          tx.user.findMany({ where: { role: "MANAGEMENT", active: true }, select: { id: true } }),
        ]);
        const notifyIds = [
          ...new Set([...adminUsers.map((u) => u.id), ...managementUsers.map((u) => u.id)]),
        ];
        await Promise.all(
          notifyIds.map((userId) =>
            tx.notification.create({
              data: {
                userId,
                type: "MANAGEMENT_CLAIMED",
                message: `Appraisal claimed by ${session.user.name} for management review.`,
                link: `/management/decide/${cycleId}`,
                persistent: false,
              },
            }),
          ),
        );
      }

      return { ok: true as const };
    });

    return res.ok ? { ok: true } : res;
  } catch {
    return { ok: false, error: "Failed to claim appraisal" };
  }
}

export async function finalizeDecisionAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || !["MANAGEMENT", "ADMIN"].includes(session.user.role)) {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { cycleId, finalRating, hikePercent, slabId, comments, managementScores, managementComment, tentativeDate1, tentativeDate2 } = parsed.data;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { ratings: true, user: { include: { salary: true } } },
  });
  if (!cycle) return { ok: false, error: "Cycle not found" };

  if (
    session.user.role !== "ADMIN" &&
    cycle.claimedById &&
    cycle.claimedById !== session.user.id
  ) {
    return { ok: false, error: "This appraisal is claimed by another management user" };
  }

  const avgRating = cycle.ratings.length > 0
    ? cycle.ratings.reduce((s, r) => s + r.averageScore, 0) / cycle.ratings.length
    : 0;

  const grossAnnum = cycle.user.salary ? Number(cycle.user.salary.grossAnnum) : 0;
  const monthlyGross = grossAnnum ? grossAnnum / 12 : 0;
  const tierKey = monthlyGross ? getSalaryTier(monthlyGross) : null;
  const dbTier =
    tierKey === "upto15k" ? "UPTO_15K" : tierKey === "upto30k" ? "BTW_15K_30K" : "ABOVE_30K";

  // Prefer slab linkage (rating → tier → slab → hike%)
  const resolvedSlab = slabId
    ? await prisma.incrementSlab.findUnique({ where: { id: slabId } })
    : (await prisma.incrementSlab.findFirst({
        where: {
          minRating: { lte: finalRating },
          maxRating: { gte: finalRating },
          salaryTier: dbTier,
        },
      })) ??
      (await prisma.incrementSlab.findFirst({
        where: {
          minRating: { lte: finalRating },
          maxRating: { gte: finalRating },
          salaryTier: "ALL",
        },
      }));

  const resolvedHikePercent = resolvedSlab ? resolvedSlab.hikePercent : hikePercent;
  const finalAmount = Math.round((grossAnnum * resolvedHikePercent) / 100);

  const cycleWithAssignments = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { assignments: { select: { reviewerId: true } } },
  });
  const reviewerIds = cycleWithAssignments?.assignments.map((a) => a.reviewerId) ?? [];

  await prisma.$transaction(async (tx) => {
    await tx.appraisalDecision.create({
      data: {
        cycleId,
        averagedRating: avgRating,
        finalRating,
        slabId: resolvedSlab?.id ?? (slabId ?? null),
        suggestedAmount: finalAmount,
        finalAmount,
        comments: comments ?? null,
        managementScores: managementScores ?? undefined,
        managementComment: managementComment ?? null,
        decidedById: session.user.id,
      },
    });
    // Build cycle update — include tentative dates if provided
    const cycleUpdateData: Record<string, unknown> = { status: "DECIDED" };
    if (tentativeDate1 && tentativeDate2) {
      const d1 = new Date(tentativeDate1);
      const d2 = new Date(tentativeDate2);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1.toDateString() !== d2.toDateString()) {
        cycleUpdateData.tentativeDate1 = d1;
        cycleUpdateData.tentativeDate2 = d2;
        cycleUpdateData.status = "DATE_VOTING";
      }
    }
    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: cycleUpdateData,
    });

    // Notify HR if tentative dates were set
    if (cycleUpdateData.tentativeDate1) {
      const hrAssignments = await tx.cycleAssignment.findMany({
        where: { cycleId, role: "HR" },
        select: { reviewerId: true },
      });
      const decidedUser = await tx.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
      const d1Str = (cycleUpdateData.tentativeDate1 as Date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      const d2Str = (cycleUpdateData.tentativeDate2 as Date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      await Promise.all(
        hrAssignments.map((a) =>
          tx.notification.create({
            data: {
              userId: a.reviewerId,
              type: "TENTATIVE_DATES_SET",
              message: `${decidedUser?.name ?? "Management"} has proposed 2 tentative dates for ${cycle.user.name}'s appraisal: ${d1Str} or ${d2Str}. Please select the confirmed date.`,
              link: `/reviewer/${cycleId}/schedule`,
              persistent: true,
            },
          })
        )
      );
    }

    // Notify employee
    await tx.notification.create({
      data: {
        userId: cycle.userId,
        type: "APPRAISAL_DECIDED",
        message: `Your appraisal decision has been finalized. Final rating: ${finalRating.toFixed(2)}. Increment: ₹${finalAmount.toLocaleString()}/yr.`,
        link: "/employee",
        persistent: true,
      },
    });

    // Notify all assigned reviewers + admins + management with summary
    const slabLabel = resolvedSlab?.label ?? "—";
    const summaryMsg = `Appraisal for ${cycle.user.name} finalized. Rating: ${finalRating.toFixed(2)}, Slab: ${slabLabel}, Increment: ₹${finalAmount.toLocaleString()}/yr.`;
    await Promise.all(
      reviewerIds.map((reviewerId) =>
        tx.notification.create({
          data: {
            userId: reviewerId,
            type: "APPRAISAL_DECIDED",
            message: summaryMsg,
            link: `/reviewer/${cycleId}`,
            persistent: false,
          },
        })
      )
    );

    // Notify admins and management
    const [adminUsers, managementUsers] = await Promise.all([
      tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
      tx.user.findMany({ where: { role: "MANAGEMENT", active: true }, select: { id: true } }),
    ]);
    const adminMgmtIds = [...new Set([...adminUsers.map((u) => u.id), ...managementUsers.map((u) => u.id)])];
    await Promise.all(
      adminMgmtIds.map((userId) =>
        tx.notification.create({
          data: {
            userId,
            type: "APPRAISAL_DECIDED",
            message: summaryMsg,
            link: `/management/decide/${cycleId}`,
            persistent: false,
          },
        })
      )
    );

    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "APPRAISAL_DECIDED",
        after: { finalRating, hikePercent, finalAmount, slabId, managementScores },
      },
    });
  });

  revalidatePath("/management");
  revalidatePath(`/management/decide/${cycleId}`);
  revalidatePath("/employee");
  return { ok: true };
}

const updateHikeSchema = z.object({
  cycleId: z.string(),
  hikePercent: z.number().min(0).max(100),
});

export async function updateHikePercentAction(
  input: z.infer<typeof updateHikeSchema>,
): Promise<Result> {
  const session = await auth();
  if (!session?.user || !["MANAGEMENT", "ADMIN"].includes(session.user.role)) {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = updateHikeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { cycleId, hikePercent } = parsed.data;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { decision: true, user: { include: { salary: true } } },
  });
  if (!cycle) return { ok: false, error: "Cycle not found" };
  if (!cycle.decision) return { ok: false, error: "No decision found" };

  const grossAnnum = cycle.user.salary ? Number(cycle.user.salary.grossAnnum) : 0;
  const finalAmount = Math.round((grossAnnum * hikePercent) / 100);

  // Find matching slab
  const monthlyGross = grossAnnum / 12;
  const tierKey = getSalaryTier(monthlyGross);
  const dbTier =
    tierKey === "upto15k" ? "UPTO_15K" : tierKey === "upto30k" ? "BTW_15K_30K" : "ABOVE_30K";
  const resolvedSlab = await prisma.incrementSlab.findFirst({
    where: {
      minRating: { lte: cycle.decision.finalRating },
      maxRating: { gte: cycle.decision.finalRating },
      salaryTier: dbTier,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.appraisalDecision.update({
      where: { cycleId },
      data: {
        slabId: resolvedSlab?.id ?? null,
        finalAmount,
        suggestedAmount: finalAmount,
      },
    });
    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "HIKE_UPDATED",
        before: { hikePercent: "previous", finalAmount: cycle.decision ? Number(cycle.decision.finalAmount) : 0 },
        after: { hikePercent, finalAmount },
      },
    });
  });

  revalidatePath(`/management/decide/${cycleId}`);
  return { ok: true };
}
