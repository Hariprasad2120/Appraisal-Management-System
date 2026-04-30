import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { SalaryCalculator } from "./salary-calculator";
import { getSalaryTier } from "@/lib/criteria";
import { getSystemDate } from "@/lib/system-date";
import { computeCycleStatus } from "@/lib/workflow";

export default async function SalaryPage() {
  const now = await getSystemDate();
  const [slabs, readyCycles] = await Promise.all([
    prisma.incrementSlab.findMany({ orderBy: { minRating: "desc" } }),
    prisma.appraisalCycle.findMany({
      include: {
        self: true,
        user: { include: { salary: true } },
        ratings: true,
        assignments: { select: { availability: true } },
        decision: { include: { slab: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const employees = readyCycles.filter((c) =>
    ["RATINGS_COMPLETE", "MANAGEMENT_REVIEW", "DATE_VOTING", "SCHEDULED", "DECIDED"].includes(
      computeCycleStatus(c, now),
    )
  ).map((c) => {
    const avg = c.ratings.length > 0
      ? c.ratings.reduce((s, r) => s + r.averageScore, 0) / c.ratings.length
      : 0;
    const grossAnnum = c.user.salary ? Number(c.user.salary.grossAnnum) : 0;
    const monthlyGross = grossAnnum / 12;
    const tierKey = getSalaryTier(monthlyGross);
    const dbTier = tierKey === "upto15k" ? "UPTO_15K" : tierKey === "upto30k" ? "BTW_15K_30K" : "ABOVE_30K";
    const flooredAvg = Math.floor(avg);
    const slab = slabs.find((s) =>
      flooredAvg >= s.minRating && flooredAvg <= s.maxRating &&
      (s.salaryTier === dbTier || s.salaryTier === "ALL")
    );
    return {
      id: c.id,
      userId: c.user.id,
      name: c.user.name,
      department: c.user.department ?? "—",
      avgRating: avg,
      hikePercent: slab?.hikePercent ?? 0,
      slabLabel: slab?.label ?? "—",
      grossAnnum,
      decided: c.status === "DECIDED",
      finalAmount: c.decision ? Number(c.decision.finalAmount) : null,
    };
  });

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Salary Impact Calculator</h1>
          <p className="text-slate-500 text-sm mt-1">
            Live salary increment preview based on appraisal ratings
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <SalaryCalculator employees={employees} slabs={slabs} />
      </FadeIn>
    </div>
  );
}
