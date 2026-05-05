import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Button } from "@/components/ui/button";
import { toTitleCase } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { Fragment } from "react";

export default async function ManagementKpiPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year ?? new Date().getFullYear());
  const reviews = await prisma.kpiReview.findMany({
    where: {
      status: "FINALIZED",
      month: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
    orderBy: [{ month: "desc" }, { monthlyPointScore: "desc" }],
    include: {
      user: { select: { id: true, name: true, employeeNumber: true } },
      department: true,
      items: { orderBy: [{ parentItemId: "asc" }, { sortOrder: "asc" }] },
    },
  });

  const annualByUser = new Map<string, { name: string; score: number; months: number }>();
  for (const review of reviews) {
    const current = annualByUser.get(review.userId) ?? { name: review.user.name, score: 0, months: 0 };
    current.score += review.monthlyPointScore;
    current.months += 1;
    annualByUser.set(review.userId, current);
  }
  const annualRows = [...annualByUser.values()].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-7xl space-y-5">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="ds-h1">KPI Reports</h1>
            <p className="ds-body mt-1">Finalized monthly KPI scores and annual leaderboard.</p>
          </div>
          <form className="flex items-end gap-2" action="/management/kpi">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Year</span>
              <input name="year" type="number" defaultValue={year} className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm" />
            </label>
            <Button type="submit" variant="outline">View</Button>
          </form>
        </div>
      </FadeIn>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <FadeIn delay={0.08}>
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="size-4 text-primary" /> Monthly Scores
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 font-medium">Employee</th>
                    <th className="px-4 font-medium">Department</th>
                    <th className="px-4 font-medium">Achievement</th>
                    <th className="px-4 font-medium">Score</th>
                    <th className="px-4 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reviews.map((review) => {
                    const criteria = review.items.filter(
                      (item) =>
                        item.itemKind === "CRITERION" &&
                        review.items.some((task) => task.parentItemId === item.id && task.itemKind === "TASK" && task.assignedToEmployee),
                    );
                    return (
                      <Fragment key={review.id}>
                        <tr>
                          <td className="px-4 py-3">{review.month.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                          <td className="px-4 font-semibold">{toTitleCase(review.user.name)}</td>
                          <td className="px-4 text-muted-foreground">{review.department.name}</td>
                          <td className="px-4">{review.totalAchievementPercent.toFixed(1)}%</td>
                          <td className="px-4 font-bold text-primary">{review.monthlyPointScore.toLocaleString("en-IN")}</td>
                          <td className="px-4 text-xs">{review.performanceCategory}</td>
                        </tr>
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid gap-2 md:grid-cols-2">
                              {criteria.map((criterion) => {
                                const tasks = review.items.filter((item) => item.parentItemId === criterion.id && item.itemKind === "TASK" && item.assignedToEmployee);
                                return (
                                  <div key={criterion.id} className="rounded-lg border border-border bg-card p-3">
                                    <p className="text-xs font-semibold text-foreground">{criterion.name}</p>
                                    <div className="mt-2 space-y-1">
                                      {tasks.map((task) => (
                                        <div key={task.id} className="flex items-center justify-between gap-2 text-[11px]">
                                          <span className="text-muted-foreground">{task.name}</span>
                                          <span className="font-medium text-foreground">{task.rating?.toFixed(2) ?? "-"} / {task.weightedAchievement.toFixed(2)}%</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                  {reviews.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">No finalized KPI records for this year.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.12}>
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="size-4 text-primary" /> Annual Leaderboard
              </h2>
            </div>
            <div className="divide-y divide-border">
              {annualRows.map((row, index) => (
                <div key={row.name} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold">{index + 1}. {toTitleCase(row.name)}</p>
                    <p className="text-xs text-muted-foreground">{row.months} finalized month{row.months === 1 ? "" : "s"}</p>
                  </div>
                  <p className="text-lg font-bold text-primary">{row.score.toLocaleString("en-IN")}</p>
                </div>
              ))}
              {annualRows.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">No leaderboard yet.</p>
              )}
            </div>
          </section>
        </FadeIn>
      </div>
    </div>
  );
}
