"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import { CRITERIA_CATEGORIES } from "@/lib/criteria";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

const schema = z.object({
  categoryName: z.string().min(1),
  questions: z.array(z.string().min(1)).min(0),
  maxPoints: z.number().int().min(1).max(500).optional(),
});

type Result = { ok: true } | { ok: false; error: string };

export async function saveCriteriaOverrideAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  const cat = CRITERIA_CATEGORIES.find((c) => c.name === parsed.data.categoryName);
  if (!cat) return { ok: false, error: "Unknown category" };

  await prisma.criteriaOverride.upsert({
    where: { organizationId_categoryName: { organizationId, categoryName: parsed.data.categoryName } },
    create: {
      organizationId,
      categoryName: parsed.data.categoryName,
      questions: parsed.data.questions,
      maxPoints: parsed.data.maxPoints ?? null,
      updatedById: session.user.id,
    },
    update: {
      questions: parsed.data.questions,
      maxPoints: parsed.data.maxPoints ?? null,
      updatedById: session.user.id,
    },
  });

  revalidateTag("criteria", "max");
  revalidatePath("/appraisal/criteria");
  revalidatePath("/appraisal");
  return { ok: true };
}

export async function resetCriteriaOverrideAction(categoryName: string): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return { ok: false, error: "Forbidden" };
  }

  await prisma.criteriaOverride.deleteMany({
    where: {
      organizationId: session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID,
      categoryName,
    },
  });
  revalidateTag("criteria", "max");
  revalidatePath("/appraisal/criteria");
  revalidatePath("/appraisal");
  return { ok: true };
}

