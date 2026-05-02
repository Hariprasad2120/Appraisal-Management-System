import { prisma } from "@/lib/db";
import { CRITERIA_CATEGORIES } from "@/lib/criteria";
import { FadeIn } from "@/components/motion-div";
import { CriteriaShell } from "./criteria-shell";

export default async function CriteriaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "reviewer" ? "reviewer" : "self";

  const overrides = await prisma.criteriaOverride.findMany();
  const overrideMap = new Map(
    overrides.map((o) => [
      o.categoryName,
      { categoryName: o.categoryName, questions: o.questions as string[], maxPoints: o.maxPoints ?? undefined },
    ])
  );

  const selfCategories = CRITERIA_CATEGORIES.filter((c) => !c.reviewerOnly);
  // Reviewer rates ALL criteria — show all 12 so admin can edit questions for every category
  const reviewerCategories = CRITERIA_CATEGORIES;

  const activeCategories = activeTab === "reviewer" ? reviewerCategories : selfCategories;
  const defaultTotal = activeCategories.reduce((s, c) => s + c.maxPoints, 0);

  const items = activeCategories.map((category, index) => ({
    category,
    override: overrideMap.get(category.name) ?? null,
    index,
  }));

  return (
    <div className="w-full max-w-7xl space-y-5">
      <FadeIn>
        <div>
          <h1 className="ds-h1">Criteria Questions</h1>
          <p className="ds-body mt-1">
            Edit questions and point weights per category.
          </p>
        </div>
      </FadeIn>

      {/* Tab switcher */}
      <FadeIn delay={0.03}>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
          <a
            href="/admin/criteria?tab=self"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "self"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Self-Assessment ({selfCategories.length})
          </a>
          <a
            href="/admin/criteria?tab=reviewer"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "reviewer"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Reviewer ({reviewerCategories.length})
          </a>
        </div>
      </FadeIn>

      <CriteriaShell items={items} defaultTotal={defaultTotal} />
    </div>
  );
}
