import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import type { CycleStatus } from "@/generated/prisma/enums";
import { computeCycleStatus } from "@/lib/workflow";
import { getSystemDate } from "@/lib/system-date";
import { getCachedSession as auth } from "@/lib/auth";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

const STATUS_COLORS: Record<CycleStatus, string> = {
  PENDING_SELF: "bg-slate-100 text-slate-600",
  SELF_SUBMITTED: "bg-blue-100 text-blue-700",
  AWAITING_AVAILABILITY: "bg-yellow-100 text-yellow-700",
  RATING_IN_PROGRESS: "bg-orange-100 text-orange-700",
  RATINGS_COMPLETE: "bg-green-100 text-green-700",
  MANAGEMENT_REVIEW: "bg-green-100 text-green-700",
  DATE_VOTING: "bg-purple-100 text-purple-700",
  SCHEDULED: "bg-teal-100 text-teal-700",
  DECIDED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

export default async function AdminCyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) return null;
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const now = await getSystemDate();

  const where: Record<string, unknown> = { organizationId };
  if (sp.status) where.status = sp.status;
  if (sp.q) {
    where.user = {
      OR: [
        { name: { contains: sp.q, mode: "insensitive" } },
        { employeeNumber: { equals: Number(sp.q) || undefined } },
      ],
    };
  }

  const cycles = await prisma.appraisalCycle.findMany({
    where,
    include: {
      user: true,
      assignments: { include: { reviewer: { select: { id: true, name: true, role: true } } } },
      ratings: { select: { averageScore: true, role: true, reviewerId: true } },
      decision: { include: { slab: true } },
      self: { select: { editableUntil: true, submittedAt: true, locked: true } },
      moms: { select: { role: true } },
      arrear: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statusOptions: CycleStatus[] = [
    "PENDING_SELF",
    "SELF_SUBMITTED",
    "AWAITING_AVAILABILITY",
    "RATING_IN_PROGRESS",
    "RATINGS_COMPLETE",
    "MANAGEMENT_REVIEW",
    "DATE_VOTING",
    "SCHEDULED",
    "DECIDED",
    "CLOSED",
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ds-h1">All Appraisal Cycles</h1>
            <p className="ds-body mt-1">{cycles.length} cycles</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <form className="flex flex-wrap gap-3">
          <input
            name="q"
            placeholder="Search by name or Emp #"
            defaultValue={sp.q}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Filter
          </button>
          {(sp.q || sp.status) && (
            <Link href="/appraisal/cycles" className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
              Clear
            </Link>
          )}
        </form>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border bg-muted/40">
                    <th className="py-2.5 px-4 ds-label">Employee</th>
                    <th className="px-4 ds-label">Emp #</th>
                    <th className="px-4 ds-label">Type</th>
                    <th className="px-4 ds-label">Status</th>
                    <th className="px-4 ds-label">Reviewers</th>
                    <th className="px-4 ds-label">Avg Score</th>
                    <th className="px-4 ds-label">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cycles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground/50">No cycles found</td>
                    </tr>
                  )}
                  {cycles.map((c) => {
                    const displayStatus = computeCycleStatus(c, now);
                    const avg =
                      c.ratings.length > 0
                        ? (c.ratings.reduce((s, r) => s + r.averageScore, 0) / c.ratings.length).toFixed(2)
                        : "â€”";
                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          <Link href={`/workspace/hrms/employees/${c.userId}/assign`} className="hover:text-[#008993] transition-colors">
                            {toTitleCase(c.user.name)}
                          </Link>
                        </td>
                        <td className="px-4 text-slate-500">{c.user.employeeNumber ?? "â€”"}</td>
                        <td className="px-4">
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded px-2 py-0.5">
                            {c.type}
                          </span>
                        </td>
                        <td className="px-4">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[displayStatus]}`}>
                            {displayStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 text-slate-500 text-xs">
                          {c.assignments.length === 0 ? (
                            "Not assigned"
                          ) : (
                            <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                              {c.assignments.map((a, index) => (
                                <span key={a.reviewer.id}>
                                  <Link
                                    href={`/workspace/hrms/employees/${a.reviewer.id}/assign`}
                                    className="transition-colors hover:text-primary hover:underline"
                                  >
                                    {a.reviewer.name.split(" ")[0]}
                                  </Link>
                                  {index < c.assignments.length - 1 ? "," : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 font-medium text-slate-700 dark:text-slate-300">{avg}</td>
                        <td className="px-4 text-slate-500">{c.startDate?.toLocaleDateString() ?? "â€”"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

