import { prisma } from "@/lib/db";
import { CRITERIA_CATEGORIES, type CriteriaCategory } from "@/lib/criteria";
import { cacheLife, cacheTag } from "next/cache";

export async function getMergedCriteria(): Promise<CriteriaCategory[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("criteria");
  const overrides = await prisma.criteriaOverride.findMany();
  const overrideMap = new Map(
    overrides.map((o) => [o.categoryName, { questions: o.questions as string[], maxPoints: o.maxPoints }])
  );

  return CRITERIA_CATEGORIES.map((cat) => {
    const ov = overrideMap.get(cat.name);
    if (ov) {
      return {
        ...cat,
        questions: ov.questions,
        ...(ov.maxPoints != null ? { maxPoints: ov.maxPoints } : {}),
      };
    }
    return cat;
  });
}
