"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getSalaryTier } from "@/lib/criteria";

const schema = z.object({
  cycleId: z.string(),
  finalRating: z.number().min(0).max(100),
  hikePercent: z.number().min(0).max(100),
  slabId: z.string().optional(),
  comments: z.string().optional(),
  managementScores: z.record(z.string(), z.number()).optional(),
  managementComment: z.string().optional(),
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

  const { cycleId, finalRating, hikePercent, slabId, comments, managementScores, managementComment } = parsed.data;

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
    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: { status: "DECIDED" },
    });
    await tx.notification.create({
      data: {
        userId: cycle.userId,
        type: "APPRAISAL_DECIDED",
        message: "Your appraisal decision has been finalized",
        link: "/employee",
      },
    });
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
