import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { GRADE_BANDS } from "@/lib/criteria";

const TIER_LABELS: Record<string, string> = {
  UPTO_15K: "≤ ₹15k/mo",
  BTW_15K_30K: "₹15k–30k/mo",
  ABOVE_30K: "> ₹30k/mo",
  ALL: "All",
};

const TIER_ORDER = ["UPTO_15K", "BTW_15K_30K", "ABOVE_30K", "ALL"];

const gradeColors: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "A":  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "B+": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "B":  "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  "C+": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "C":  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "D":  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default async function ManagementSlabsPage() {
  const session = await auth();
  const allowed = ["ADMIN", "MANAGEMENT"];
  if (!session?.user || (!allowed.includes(session.user.role) && !(session.user.secondaryRole && allowed.includes(session.user.secondaryRole)))) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Access restricted. Salary slabs are visible to Admin and Management only.
      </div>
    );
  }

  const slabs = await prisma.incrementSlab.findMany({
    orderBy: [{ minRating: "desc" }, { salaryTier: "asc" }],
  });

  const gradeOrder = GRADE_BANDS.map((b) => b.grade);
  const slabsByGrade = new Map<string, typeof slabs>();
  for (const s of slabs) {
    if (!slabsByGrade.has(s.grade)) slabsByGrade.set(s.grade, []);
    slabsByGrade.get(s.grade)!.push(s);
  }

  const tiersPresent = [...new Set(slabs.map((s) => s.salaryTier))].sort(
    (a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b),
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Increment Slabs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hike % by grade and salary tier — read-only view
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.03}>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {GRADE_BANDS.map((b) => (
            <div key={b.grade} className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5">
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${gradeColors[b.grade] ?? "bg-muted text-muted-foreground"}`}>
                {b.grade}
              </span>
              <span className="text-muted-foreground">{b.label}</span>
              <span className="text-muted-foreground/60">{b.minNormalized}–{b.maxNormalized}</span>
            </div>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.07}>
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hike % by Grade × Salary Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {slabs.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">
                No slabs configured. Contact admin.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b bg-muted/40">
                      <th className="py-3 px-4 font-medium">Grade</th>
                      <th className="px-4 font-medium">Score Band</th>
                      <th className="px-4 font-medium">Label</th>
                      {tiersPresent.map((t) => (
                        <th key={t} className="px-4 font-medium">{TIER_LABELS[t] ?? t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {gradeOrder.map((grade) => {
                      const band = GRADE_BANDS.find((b) => b.grade === grade);
                      const gradeSlabs = slabsByGrade.get(grade) ?? [];
                      if (gradeSlabs.length === 0) return null;

                      return (
                        <tr key={grade} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-4">
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${gradeColors[grade] ?? "bg-muted text-muted-foreground"}`}>
                              {grade}
                            </span>
                          </td>
                          <td className="px-4 text-muted-foreground">
                            {band ? `${band.minNormalized}–${band.maxNormalized}` : "—"}
                          </td>
                          <td className="px-4 text-foreground">
                            {band?.label ?? "—"}
                          </td>
                          {tiersPresent.map((tier) => {
                            const slab = gradeSlabs.find((s) => s.salaryTier === tier);
                            return (
                              <td key={tier} className="px-4">
                                {slab ? (
                                  <span className={`font-semibold ${slab.hikePercent > 0 ? "text-green-600 dark:text-green-400" : "text-red-400"}`}>
                                    {slab.hikePercent > 0 ? `${slab.hikePercent}%` : "Nil"}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
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
    </div>
  );
}
