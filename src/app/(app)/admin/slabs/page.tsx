import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { SlabForm } from "./slab-form";
import { deleteSlabAction, seedSlabsAction } from "./actions";
import { GRADE_BANDS } from "@/lib/criteria";

const TIER_LABELS: Record<string, string> = {
  UPTO_15K: "≤ ₹15k/mo",
  BTW_15K_30K: "₹15k–30k/mo",
  ABOVE_30K: "> ₹30k/mo",
  ALL: "All",
};

const TIER_ORDER = ["UPTO_15K", "BTW_15K_30K", "ABOVE_30K", "ALL"];

const gradeColors: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-700",
  "A":  "bg-green-100 text-green-700",
  "B+": "bg-blue-100 text-blue-700",
  "B":  "bg-sky-100 text-sky-700",
  "C+": "bg-yellow-100 text-yellow-700",
  "C":  "bg-orange-100 text-orange-700",
  "D":  "bg-red-100 text-red-700",
};

export default async function SlabsPage() {
  const slabs = await prisma.incrementSlab.findMany({
    orderBy: [{ minRating: "desc" }, { salaryTier: "asc" }],
  });

  // Group slabs by grade for the matrix view
  const gradeOrder = GRADE_BANDS.map((b) => b.grade);
  const slabsByGrade = new Map<string, typeof slabs>();
  for (const s of slabs) {
    if (!slabsByGrade.has(s.grade)) slabsByGrade.set(s.grade, []);
    slabsByGrade.get(s.grade)!.push(s);
  }

  // Detect tiers present in DB
  const tiersPresent = [...new Set(slabs.map((s) => s.salaryTier))].sort(
    (a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b),
  );

  // Custom slabs = those with grade not in standard grade bands or unlisted
  const standardGrades = new Set(gradeOrder);
  const customSlabs = slabs.filter((s) => !standardGrades.has(s.grade) || s.grade === "");

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ds-h1">Increment Slabs</h1>
            <p className="ds-body mt-1">Hike % by grade and salary tier</p>
          </div>
          <form action={async () => { "use server"; await seedSlabsAction(); }}>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#008993] hover:text-[#008993] transition-colors"
            >
              Seed Defaults
            </button>
          </form>
        </div>
      </FadeIn>

      {/* Grade reference bar */}
      <FadeIn delay={0.03}>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {GRADE_BANDS.map((b) => (
            <div key={b.grade} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5">
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${gradeColors[b.grade] ?? "bg-slate-100 text-slate-600"}`}>
                {b.grade}
              </span>
              <span className="text-slate-500">{b.label}</span>
              <span className="text-slate-400">{b.minNormalized}–{b.maxNormalized}</span>
            </div>
          ))}
        </div>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Matrix table */}
        <FadeIn delay={0.07}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Hike % by Grade × Salary Tier
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {slabs.length === 0 ? (
                <p className="text-center text-muted-foreground/50 py-10 text-sm">
                  No slabs — click &quot;Seed Defaults&quot; to populate
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-left border-b border-border bg-muted/40">
                        <th className="py-2.5 px-4 ds-label">Grade</th>
                        <th className="px-4 ds-label">Score Band</th>
                        <th className="px-4 ds-label">Label</th>
                        {tiersPresent.map((t) => (
                          <th key={t} className="px-4 ds-label">{TIER_LABELS[t] ?? t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {gradeOrder.map((grade) => {
                        const band = GRADE_BANDS.find((b) => b.grade === grade);
                        const gradeSlabs = slabsByGrade.get(grade) ?? [];
                        if (gradeSlabs.length === 0) return null;

                        return (
                          <tr key={grade} className="hover:bg-muted/30 transition-colors group">
                            <td className="py-2.5 px-4">
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${gradeColors[grade] ?? "bg-slate-100 text-slate-600"}`}>
                                {grade}
                              </span>
                            </td>
                            <td className="px-4 text-slate-500">
                              {band ? `${band.minNormalized}–${band.maxNormalized}` : "—"}
                            </td>
                            <td className="px-4 text-slate-600 dark:text-slate-400">
                              {band?.label ?? "—"}
                            </td>
                            {tiersPresent.map((tier) => {
                              const slab = gradeSlabs.find((s) => s.salaryTier === tier);
                              return (
                                <td key={tier} className="px-4">
                                  {slab ? (
                                    <div className="flex items-center gap-2">
                                      <span className={`font-semibold ${slab.hikePercent > 0 ? "text-green-600 dark:text-green-400" : "text-red-400"}`}>
                                        {slab.hikePercent > 0 ? `${slab.hikePercent}%` : "Nil"}
                                      </span>
                                      <form action={deleteSlabAction} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <input type="hidden" name="id" value={slab.id} />
                                        <button type="submit" className="text-[10px] text-red-400 hover:text-red-600">×</button>
                                      </form>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Add custom slab form */}
        <FadeIn delay={0.15}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Slab</CardTitle>
            </CardHeader>
            <CardContent>
              <SlabForm />
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Custom/unlisted slabs */}
      {customSlabs.length > 0 && (
        <FadeIn delay={0.2}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Custom Slabs</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-left border-b border-border bg-muted/40">
                      <th className="py-2.5 px-4 ds-label">Label</th>
                      <th className="px-4 ds-label">Rating Band</th>
                      <th className="px-4 ds-label">Tier</th>
                      <th className="px-4 ds-label">Hike %</th>
                      <th className="px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customSlabs.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="py-2 px-4 font-medium text-slate-900 dark:text-white">{s.label}</td>
                        <td className="px-4 text-slate-500">{s.minRating}–{s.maxRating}</td>
                        <td className="px-4 text-slate-500">{TIER_LABELS[s.salaryTier] ?? s.salaryTier}</td>
                        <td className="px-4 font-semibold text-green-600">{s.hikePercent}%</td>
                        <td className="px-4">
                          <form action={deleteSlabAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <button type="submit" className="text-xs text-red-500 hover:text-red-700">Delete</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
