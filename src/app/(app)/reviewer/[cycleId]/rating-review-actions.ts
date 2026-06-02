"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const schema = z.object({
  ratingId: z.string().min(1),
  cycleId: z.string().min(1),
  criteriaName: z.string().min(1),
  originalScore: z.number(),
  revisedScore: z.number().min(0),
  justification: z.string().min(1, "Justification required"),
});

type Result = { ok: true } | { ok: false; error: string };

export async function submitRatingReviewAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const rating = await prisma.rating.findFirst({
    where: { id: parsed.data.ratingId, reviewerId: session.user.id },
  });
  if (!rating) return { ok: false, error: "Rating not found or not yours" };

  await prisma.ratingReview.upsert({
    where: { ratingId_criteriaName: { ratingId: parsed.data.ratingId, criteriaName: parsed.data.criteriaName } },
    create: {
      ratingId: parsed.data.ratingId,
      cycleId: parsed.data.cycleId,
      reviewerId: session.user.id,
      criteriaName: parsed.data.criteriaName,
      originalScore: parsed.data.originalScore,
      revisedScore: parsed.data.revisedScore,
      justification: parsed.data.justification,
    },
    update: {
      revisedScore: parsed.data.revisedScore,
      justification: parsed.data.justification,
      originalScore: parsed.data.originalScore,
    },
  });

  await prisma.auditLog.create({
    data: {
      cycleId: parsed.data.cycleId,
      actorId: session.user.id,
      action: "RATING_REVIEW_SUBMITTED",
      before: { criteriaName: parsed.data.criteriaName, score: parsed.data.originalScore },
      after: { criteriaName: parsed.data.criteriaName, score: parsed.data.revisedScore, justification: parsed.data.justification },
    },
  });

  revalidatePath(`/reviewer/${parsed.data.cycleId}`);
  return { ok: true };
}
