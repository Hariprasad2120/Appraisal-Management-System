import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import Link from "next/link";
import { HistoryFilters } from "./history-filters";
import { computeCycleStatus } from "@/lib/workflow";
import { getSystemDate } from "@/lib/system-date";

const STATUS_COLORS: Record<string, string> = {
  DECIDED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CLOSED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  RATINGS_COMPLETE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  MANAGEMENT_REVIEW:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  SCHEDULED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  PENDING_SELF:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  SELF_SUBMITTED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  RATING_IN_PROGRESS:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  AWAITING_AVAILABILITY:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DATE_VOTING:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    year?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) return null;
  const now = await getSystemDate();

  const role = session.user.role;
  const secondaryRole = session.user.secondaryRole;
  const isReviewerRole = ["HR", "TL", "MANAGER"].includes(role);
  const isAdminRole = role === "ADMIN" || secondaryRole === "ADMIN";
  const isManagementOrPartner = role === "MANAGEMENT" || role === "PARTNER";

  const where: Record<string, unknown> = {};

  if (isManagementOrPartner || isAdminRole) {
    // see all
  } else if (isReviewerRole) {
    where.assignments = { some: { reviewerId: session.user.id } };
  } else {
    where.userId = session.user.id;
  }

  if (sp.q) {
    where.user = {
      OR: [
        { name: { contains: sp.q, mode: "insensitive" } },
        { employeeNumber: { equals: Number(sp.q) || undefined } },
      ],
    };
  }

  if (sp.status) {
    where.status = sp.status;
  }

  const cycles = await prisma.appraisalCycle.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          department: true,
        },
      },
      decision: { include: { slab: true } },
      ratings: { select: { averageScore: true, role: true, reviewerId: true } },
      assignments: {
        select: { reviewerId: true, availability: true, reviewer: { select: { name: true } } },
      },
      self: { select: { editableUntil: true, submittedAt: true, locked: true } },
      moms: { select: { role: true } },
      arrear: { select: { status: true } },
    },
    orderBy: { startDate: "desc" },
    take: 200,
  });

  const filtered = cycles.filter((c) => {
    if (sp.month && c.startDate.getMonth() !== Number(sp.month) - 1)
      return false;
    if (sp.year && c.startDate.getFullYear() !== Number(sp.year)) return false;
    return true;
  });

  const canViewEmployeeDetail = isAdminRole || isManagementOrPartner;
  const canViewCycleDetail = isAdminRole || isManagementOrPartner;

  return (
    <div className="space-y-5 max-w-7xl">
      <FadeIn>
        <div>
          <h1 className="ds-h1">Appraisal History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isReviewerRole
              ? "Appraisals you were assigned to review"
              : `${filtered.length} records`}
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.07}>
        <HistoryFilters
          defaultQ={sp.q}
          defaultMonth={sp.month}
          defaultYear={sp.year}
          defaultStatus={sp.status}
          showSearch={!isReviewerRole || isAdminRole || isManagementOrPartner}
        />
      </FadeIn>

      <FadeIn delay={0.12}>
        <p className="text-xs text-muted-foreground">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </p>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card className="border border-border shadow-sm bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                    <th className="py-3 px-4 font-medium">Employee</th>
                    {(isAdminRole || isManagementOrPartner) && (
                      <th className="px-4 font-medium">Emp #</th>
                    )}
                    <th className="px-4 font-medium">Type</th>
                    <th className="px-4 font-medium">Start</th>
                    <th className="px-4 font-medium">Status</th>
                    <th className="px-4 font-medium">Avg Rating</th>
                    <th className="px-4 font-medium">Grade</th>
                    <th className="px-4 font-medium">Slab</th>
                    <th className="px-4 font-medium">Final Hike</th>
                    {isReviewerRole && (
                      <th className="px-4 font-medium">My Rating</th>
                    )}
                    {canViewCycleDetail && (
                      <th className="px-4 font-medium">Detail</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No records found
                      </td>
                    </tr>
                  )}
                  {filtered.map((c) => {
                    const displayStatus = computeCycleStatus(c, now);
                    const avg =
                      c.ratings.length > 0
                        ? c.ratings.reduce((s, r) => s + r.averageScore, 0) /
                          c.ratings.length
                        : null;
                    const myRating = isReviewerRole
                      ? c.ratings.find((r) => r.reviewerId === session.user.id)
                      : null;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-foreground">
                          {canViewEmployeeDetail ? (
                            <Link
                              href={`/admin/employees/${c.user.id}`}
                              className="hover:text-primary transition-colors"
                            >
                              {toTitleCase(c.user.name)}
                            </Link>
                          ) : (
                            toTitleCase(c.user.name)
                          )}
                        </td>
                        {(isAdminRole || isManagementOrPartner) && (
                          <td className="px-4 text-muted-foreground">
                            {c.user.employeeNumber ?? "—"}
                          </td>
                        )}
                        <td className="px-4">
                          <span className="text-xs bg-muted text-muted-foreground rounded px-2 py-0.5">
                            {c.type}
                          </span>
                        </td>
                        <td className="px-4 text-muted-foreground whitespace-nowrap">
                          {c.startDate.toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4">
                          <span
                            className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                              STATUS_COLORS[displayStatus] ??
                              "bg-muted text-muted-foreground"
                            }`}
                          >
                            {displayStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 font-medium text-foreground">
                          {avg !== null ? avg.toFixed(2) : "—"}
                        </td>
                        <td className="px-4">
                          {c.decision?.slab?.grade ? (
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                              {c.decision.slab.grade}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4">
                          {c.decision?.slab ? (
                            <span className="text-xs text-purple-600 dark:text-purple-400">
                              {c.decision.slab.label}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                          {c.decision
                            ? `+₹${Number(c.decision.finalAmount).toLocaleString("en-IN")}`
                            : "—"}
                        </td>
                        {isReviewerRole && (
                          <td className="px-4 text-muted-foreground">
                            {myRating ? (
                              <span className="font-semibold text-primary">
                                {myRating.averageScore.toFixed(1)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                        {canViewCycleDetail && (
                          <td className="px-4">
                            <Link
                              href={`/admin/cycles/${c.id}`}
                              className="text-xs text-primary hover:text-primary/80 font-medium"
                            >
                              View →
                            </Link>
                          </td>
                        )}
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
