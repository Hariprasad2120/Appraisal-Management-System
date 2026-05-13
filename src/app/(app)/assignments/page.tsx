import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Users,
} from "lucide-react";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { getSystemDate } from "@/lib/system-date";
import { getCycleStageInfo } from "@/lib/workflow";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

function assignmentRoute(
  assignment: {
    availability: "PENDING" | "AVAILABLE" | "NOT_AVAILABLE";
    cycle: {
      id: string;
      status: "PENDING_SELF" | "SELF_SUBMITTED" | "AWAITING_AVAILABILITY" | "RATING_IN_PROGRESS" | "RATINGS_COMPLETE" | "MANAGEMENT_REVIEW" | "DATE_VOTING" | "SCHEDULED" | "DECIDED" | "CLOSED";
      ratingDeadline: Date | null;
      scheduledDate: Date | null;
      tentativeDate1: Date | null;
      tentativeDate2: Date | null;
      self: { editableUntil: Date; submittedAt: Date | null; locked: boolean } | null;
      assignments: { availability: "PENDING" | "AVAILABLE" | "NOT_AVAILABLE" }[];
      ratings: { reviewerId: string; averageScore: number }[];
      decision?: { id: string } | null;
      moms?: { role: string }[];
      arrear?: { status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "PAID" } | null;
    };
  },
  reviewerId: string,
  now: Date,
) {
  const stage = getCycleStageInfo(assignment.cycle, reviewerId, assignment, now);

  return {
    href: stage.actionHref,
    label: stage.actionLabel,
    className:
      stage.tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
        : stage.tone === "primary"
          ? "border-primary/25 bg-primary/10 text-primary"
          : stage.tone === "green"
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
            : stage.tone === "blue"
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
              : stage.tone === "purple"
                ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400"
                : "border-border bg-muted text-muted-foreground",
  };
}

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const now = await getSystemDate();
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const assignments = await prisma.cycleAssignment.findMany({
    where: { organizationId, reviewerId: session.user.id },
    orderBy: { assignedAt: "desc" },
    include: {
      cycle: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeNumber: true,
              department: true,
              designation: true,
            },
          },
          self: {
            select: {
              editableUntil: true,
              submittedAt: true,
              locked: true,
              status: true,
            },
          },
          assignments: { select: { availability: true } },
          ratings: { select: { reviewerId: true, averageScore: true } },
          decision: { select: { id: true } },
          moms: { select: { role: true } },
          arrear: { select: { status: true } },
        },
      },
    },
  });

  const pendingAvailability = assignments.filter(
    (a) => a.availability === "PENDING",
  ).length;
  const completed = assignments.filter((a) =>
    getCycleStageInfo(a.cycle, session.user.id, a, now).kind === "completed",
  ).length;
  const pendingRating = assignments.filter(
    (a) =>
      getCycleStageInfo(a.cycle, session.user.id, a, now).kind === "active" &&
      getCycleStageInfo(a.cycle, session.user.id, a, now).actionLabel === "Rate Now",
  ).length;
  const postReview = assignments.filter(
    (a) => getCycleStageInfo(a.cycle, session.user.id, a, now).kind === "post_review",
  ).length;

  return (
    <div className="w-full max-w-7xl space-y-6">
      <FadeIn>
        <div>
          <h1 className="ds-h1">All Assignments</h1>
          <p className="ds-body mt-1">
            Every appraisal assigned to you for review.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="grid gap-4 sm:grid-cols-4">
          <SummaryCard
            label="Total Assigned"
            value={assignments.length}
            icon={<Users className="size-4 text-[#0e8a95]" />}
            accent="stat-teal"
          />
          <SummaryCard
            label="Action Required"
            value={pendingAvailability + pendingRating}
            icon={<AlertCircle className="size-4 text-amber-500" />}
            accent="stat-amber"
          />
          <SummaryCard
            label="Post Review"
            value={postReview}
            icon={<CheckCircle className="size-4 text-green-500" />}
            accent="stat-green"
          />
          <SummaryCard
            label="Completed"
            value={completed}
            icon={<CheckCircle className="size-4 text-green-500" />}
            accent="stat-green"
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardList className="size-3.5" />
              Assigned Appraisals
            </span>
            <span className="text-xs text-primary">
              {assignments.length} total
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No assignments yet.
            </div>
          ) : (
            <div className="overflow-x-auto px-5 py-4">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {[
                      "#",
                      "Employee",
                      "Emp #",
                      "Cycle",
                      "Role",
                      "Assigned",
                      "Availability",
                      "Reviewers",
                      "Action",
                    ].map((h) => (
                      <th key={h} className="px-2 py-2.5 ds-label">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assignments.map((assignment, idx) => {
                    const route = assignmentRoute(
                      assignment,
                      session.user.id,
                      now,
                    );
                    const doneReviewers = assignment.cycle.ratings.length;
                    const totalReviewers = assignment.cycle.assignments.length;

                    return (
                      <tr
                        key={assignment.id}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-2 py-3 font-mono text-xs text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-3">
                          <Link
                            href={route.href}
                            className="font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                          >
                            {toTitleCase(assignment.cycle.user.name)}
                          </Link>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {[
                              assignment.cycle.user.department,
                              assignment.cycle.user.designation,
                            ]
                              .filter(Boolean)
                              .join(" - ") || "-"}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-xs text-muted-foreground">
                          {assignment.cycle.user.employeeNumber ?? "-"}
                        </td>
                        <td className="px-2 py-3">
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {assignment.cycle.type}
                          </span>
                        </td>
                        <td className="px-2 py-3 font-mono text-xs font-semibold text-muted-foreground">
                          {assignment.role}
                        </td>
                        <td className="px-2 py-3 text-xs text-muted-foreground">
                          {assignment.assignedAt.toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-2 py-3">
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {assignment.availability.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-xs text-muted-foreground">
                          {doneReviewers}/{totalReviewers}
                        </td>
                        <td className="px-2 py-3">
                          <Link
                            href={route.href}
                            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${route.className}`}
                          >
                            {route.label}
                            <ChevronRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 shadow-sm ${accent}`}
    >
      <div className="mb-3 flex size-9 items-center justify-center rounded-[10px] bg-primary/10">
        {icon}
      </div>
      <div className="ds-stat">{value}</div>
      <div className="ds-small mt-1">{label}</div>
    </div>
  );
}
