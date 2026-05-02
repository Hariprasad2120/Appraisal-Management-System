"use client";

import { useState } from "react";
import { FadeIn } from "@/components/motion-div";
import { CriteriaEditor } from "./criteria-editor";
import type { CriteriaCategory } from "@/lib/criteria";

type Override = { categoryName: string; questions: string[]; maxPoints?: number } | null;

type CategoryWithOverride = {
  category: CriteriaCategory;
  override: Override;
  index: number;
};

export function CriteriaShell({
  items,
  defaultTotal,
}: {
  items: CategoryWithOverride[];
  defaultTotal: number;
}) {
  const [pointsMap, setPointsMap] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const { category, override } of items) {
      m[category.name] = override?.maxPoints ?? category.maxPoints;
    }
    return m;
  });

  const liveTotal = Object.values(pointsMap).reduce((s, v) => s + v, 0);
  const totalChanged = liveTotal !== defaultTotal;

  return (
    <>
      {/* Live total banner */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
        <span className="text-xs text-slate-500">
          Editable categories total
          {totalChanged && (
            <span className="ml-1.5 text-[10px] text-slate-400">(was {defaultTotal})</span>
          )}
        </span>
        <span className={`text-lg font-bold ${totalChanged ? "text-[#008993]" : "text-slate-700 dark:text-slate-300"}`}>
          {liveTotal} pts
        </span>
      </div>

      {/* Editors */}
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map(({ category, override, index }) => (
          <FadeIn key={category.name} delay={index * 0.04}>
            <CriteriaEditor
              category={category}
              existingOverride={override}
              reviewerOnly={category.reviewerOnly}
              onMaxPointsChange={(pts) =>
                setPointsMap((prev) => ({ ...prev, [category.name]: pts }))
              }
            />
          </FadeIn>
        ))}
      </div>
    </>
  );
}
