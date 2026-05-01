import { prisma } from "@/lib/db";
import { CRITERIA_CATEGORIES, type CriteriaCategory } from "@/lib/criteria";
import { unstable_cache } from "next/cache";

const getCachedCriteriaOverrides = unstable_cache(
  async () => prisma.criteriaOverride.findMany(),
  ["criteria-overrides"],
  { tags: ["criteria"], revalidate: 3600 }
);

export async function getMergedCriteria(): Promise<CriteriaCategory[]> {
  const overrides = await getCachedCriteriaOverrides();
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
