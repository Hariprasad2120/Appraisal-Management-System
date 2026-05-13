"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getCachedSession as auth } from "@/lib/auth";

const schema = z.object({
  ratingId: z.string().min(1),
  cycleId: z.string().min(1),
  evaluation: z.enum(["ACCURATE", "OVERRATED", "UNDERRATED"]),
  comment: z.string().optional(),
  // Optional revised scores per criteria: { criteriaName: score }
  revisedScores: z.record(z.string(), z.number()).optional(),
  // Per-criteria evaluations: { criteriaName: "ACCURATE" | "OVERRATED" | "UNDERRATED" }
  criteriaEvaluations: z.record(z.string(), z.enum(["ACCURATE", "OVERRATED", "UNDERRATED"])).optional(),
});

type Result = { ok: true } | { ok: false; error: string };

export async function submitRatingDisagreementAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { ratingId, cycleId, evaluation, comment, revisedScores, criteriaEvaluations } = parsed.data;

  if (evaluation !== "ACCURATE" && !comment?.trim()) {
    return { ok: false, error: "Comment is required when marking Overrated or Underrated" };
  }

  const rating = await prisma.rating.findFirst({
    where: { id: ratingId, reviewerId: session.user.id },
    include: { cycle: { include: { user: { include: { salary: true } } } } },
  });
  if (!rating) return { ok: false, error: "Rating not found or not yours" };

  // Compute ceiling bounds based on evaluation
  const grossAnnum = rating.cycle.user.salary ? Number(rating.cycle.user.salary.grossAnnum) : 0;

  // Fetch suggested slab for the current rating
  const flooredRating = Math.floor(rating.averageScore);
  const slab = await prisma.incrementSlab.findFirst({
    where: { minRating: { lte: flooredRating }, maxRating: { gte: flooredRating } },
  });
  const baseHike = slab?.hikePercent ?? 0;
  const baseAmount = Math.round(grossAnnum * baseHike / 100);

  let ceilingMin: number | null = null;
  let ceilingMax: number | null = null;

  if (evaluation === "UNDERRATED") {
    // Allow negotiation up to 20% above base amount
    ceilingMin = baseAmount;
    ceilingMax = Math.round(baseAmount * 1.2);
  } else if (evaluation === "OVERRATED") {
    // Restrict to 80% of base amount
    ceilingMin = Math.round(baseAmount * 0.8);
    ceilingMax = baseAmount;
  }

  // Merge revisedScores and criteriaEvaluations into a single JSON blob
  const mergedData = {
    revisedScores: revisedScores ?? null,
    criteriaEvaluations: criteriaEvaluations ?? null,
  };
  const revisedScoresValue = mergedData as unknown as Prisma.InputJsonValue;

  await prisma.ratingDisagreement.upsert({
    where: { ratingId },
    create: {
      ratingId,
      cycleId,
      reviewerId: session.user.id,
      evaluation,
      comment: comment?.trim() ?? null,
      revisedScores: revisedScoresValue,
      ceilingMin: ceilingMin !== null ? ceilingMin : null,
      ceilingMax: ceilingMax !== null ? ceilingMax : null,
    },
    update: {
      evaluation,
      comment: comment?.trim() ?? null,
      revisedScores: revisedScoresValue,
      ceilingMin: ceilingMin !== null ? ceilingMin : null,
      ceilingMax: ceilingMax !== null ? ceilingMax : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      cycleId,
      actorId: session.user.id,
      action: "RATING_EVALUATION_SUBMITTED",
      before: Prisma.JsonNull,
      after: {
        evaluation,
        comment: comment?.trim() ?? null,
        ceilingMin,
        ceilingMax,
        revisedScores: revisedScores ?? null,
      },
    },
  });

  revalidatePath(`/reviewer/${cycleId}`);
  return { ok: true };
}
