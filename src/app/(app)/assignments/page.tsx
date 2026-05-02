import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { getSystemDate } from "@/lib/system-date";
import { isRatingOpen } from "@/lib/workflow";

function assignmentRoute(
  assignment: {
    availability: string;
    cycle: {
      id: string;
      ratings: { reviewerId: string }[];
    };
  },
  reviewerId: string,
  ratingOpen: boolean,
) {
  const rated = assignment.cycle.ratings.some(
    (r) => r.reviewerId === reviewerId,
  );

  if (assignment.availability === "PENDING") {
    return {
      href: `/reviewer/${assignment.cycle.id}/availability`,
      label: "Set Availability",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
    };
  }

  if (rated) {
    return {
      href: `/reviewer/${assignment.cycle.id}/rate`,
      label: "View Form",
      className:
        "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400",
    };
  }

  if (assignment.availability === "AVAILABLE" && ratingOpen) {
    return {
      href: `/reviewer/${assignment.cycle.id}/rate`,
      label: "Rate Now",
      className: "border-primary/25 bg-primary/10 text-primary",
    };
  }

  return {
    href: `/reviewer/${assignment.cycle.id}`,
    label: "View Details",
    className: "border-border bg-muted text-muted-foreground",
  };
}

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const now = await getSystemDate();
  const assignments = await prisma.cycleAssignment.findMany({
    where: { reviewerId: session.user.id },
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
        },
      },
    },
  });

  const pendingAvailability = assignments.filter(
    (a) => a.availability === "PENDING",
  ).length;
  const completed = assignments.filter((a) =>
    a.cycle.ratings.some((r) => r.reviewerId === session.user.id),
  ).length;
  const pendingRating = assignments.filter(
    (a) =>
      a.availability === "AVAILABLE" &&
      isRatingOpen(a.cycle, now) &&
      !a.cycle.ratings.some((r) => r.reviewerId === session.user.id),
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
        <div className="grid gap-4 sm:grid-cols-3">
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
                    const ratingOpen = isRatingOpen(assignment.cycle, now);
                    const route = assignmentRoute(
                      assignment,
                      session.user.id,
                      ratingOpen,
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
