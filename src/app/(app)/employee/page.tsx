import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysUntilAnniversary } from "@/lib/business-days";
import { toTitleCase } from "@/lib/utils";
import {
  computeCycleStatus,
  allReviewersAvailable,
  isSelfAssessmentSubmitted,
} from "@/lib/workflow";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import {
  Calendar,
  Star,
  TrendingUp,
  FileText,
  ChevronRight,
  CheckCircle,
  Circle,
  Clock,
  Users,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING_SELF: "Self-assessment pending",
  SELF_SUBMITTED: "Self-assessment submitted",
  AWAITING_AVAILABILITY: "Reviewers confirming availability",
  RATING_IN_PROGRESS: "Rating in progress",
  RATINGS_COMPLETE: "Ratings complete",
  MANAGEMENT_REVIEW: "Management review",
  DATE_VOTING: "Scheduling meeting",
  SCHEDULED: "Meeting scheduled",
  DECIDED: "Decision finalized",
  CLOSED: "Closed",
};

export default async function EmployeeDashboard() {
  const session = await auth();
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { salary: true },
  });
  if (!user) return null;

  const cycles = await prisma.appraisalCycle.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      self: true,
      assignments: {
        include: { reviewer: { select: { id: true, name: true } } },
      },
      ratings: { select: { role: true, averageScore: true, reviewerId: true } },
      decision: { include: { slab: true } },
      mom: true,
    },
  });

  const cycle = cycles[0] ?? null;
  const days = daysUntilAnniversary(user.joiningDate, new Date());
  const displayStatus = cycle
    ? computeCycleStatus({
        id: cycle.id,
        status: cycle.status,
        self: cycle.self,
        assignments: cycle.assignments,
        ratings: cycle.ratings,
      })
    : null;

  const allAvailable = cycle ? allReviewersAvailable(cycle.assignments) : false;
  const selfSubmitted = cycle?.self ? isSelfAssessmentSubmitted(cycle.self) : false;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {toTitleCase(user.name)}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Joined {user.joiningDate.toLocaleDateString()} ·{" "}
            {days === 0
              ? "Anniversary today!"
              : `${days} day${days === 1 ? "" : "s"} to next anniversary`}
          </p>
        </div>
      </FadeIn>

      <StaggerList className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <Card className="border border-border shadow-sm stat-teal bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/20">
                  <Calendar className="size-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="text-xs text-muted-foreground">Joining Date</div>
              </div>
              <div className="font-semibold text-foreground">
                {user.joiningDate.toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="border border-border shadow-sm stat-amber bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <Star className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-xs text-muted-foreground">Total Cycles</div>
              </div>
              <div className="font-semibold text-foreground">{cycles.length}</div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="border border-border shadow-sm stat-green bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20">
                  <TrendingUp className="size-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-xs text-muted-foreground">Gross Salary</div>
              </div>
              <div className="font-semibold text-foreground">
                {user.salary
                  ? `₹${Number(user.salary.grossAnnum).toLocaleString()}/yr`
                  : "—"}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerList>

      {days <= 7 && (
        <FadeIn delay={0.2}>
          <Card className="border border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/10 shadow-sm">
            <CardContent className="p-4 text-sm text-teal-700 dark:text-teal-300">
              Your appraisal cycle is approaching within a week of your anniversary.
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {cycle ? (
        <FadeIn delay={0.25}>
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-foreground">Current Appraisal — {cycle.type}</span>
                <span className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-0.5 font-normal w-fit">
                  {STATUS_LABELS[displayStatus ?? ""] ?? displayStatus}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">

              {/* Reviewer availability */}
              {cycle.assignments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Users className="size-3.5" /> Reviewer Availability
                  </div>
                  {cycle.assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5 py-1">
                      {a.availability === "AVAILABLE" ? (
                        <CheckCircle className="size-4 text-green-500 shrink-0" />
                      ) : a.availability === "NOT_AVAILABLE" ? (
                        <Circle className="size-4 text-red-400 shrink-0" />
                      ) : (
                        <Clock className="size-4 text-amber-400 shrink-0" />
                      )}
                      <span className="text-xs text-foreground flex-1">
                        {toTitleCase(a.reviewer.name)}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          a.availability === "AVAILABLE"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : a.availability === "NOT_AVAILABLE"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {a.role} ·{" "}
                        {a.availability === "AVAILABLE"
                          ? "Available"
                          : a.availability === "NOT_AVAILABLE"
                          ? "Not Available"
                          : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Self-assessment */}
              {cycle.self && (
                <div
                  className={`rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selfSubmitted
                      ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                      : allAvailable
                      ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                      : "bg-muted border border-border"
                  }`}
                >
                  <div>
                    <p
                      className={`font-medium text-sm ${
                        selfSubmitted
                          ? "text-green-700 dark:text-green-400"
                          : allAvailable
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {selfSubmitted
                        ? "Self-assessment submitted"
                        : allAvailable
                        ? "Self-assessment due"
                        : "Self-assessment locked"}
                    </p>
                    {!selfSubmitted && allAvailable && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        Deadline: {cycle.self.editableUntil.toLocaleString()}
                      </p>
                    )}
                    {!allAvailable && !selfSubmitted && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Waiting for all reviewers to confirm availability
                      </p>
                    )}
                  </div>
                  {!selfSubmitted && allAvailable && (
                    <Link
                      href={`/employee/self/${cycle.id}`}
                      className="flex items-center gap-1 bg-amber-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-600 transition-colors w-fit"
                    >
                      {Object.keys(cycle.self.answers as object).length > 0
                        ? "Continue"
                        : "Start"}{" "}
                      <ChevronRight className="size-3" />
                    </Link>
                  )}
                </div>
              )}

              {/* Rating progress */}
              {cycle.assignments.length > 0 && allAvailable && selfSubmitted && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Star className="size-3.5" /> Rating Progress
                  </div>
                  {cycle.assignments.map((a) => {
                    const hasRated = cycle.ratings.some((r) => r.reviewerId === a.reviewer.id);
                    return (
                      <div key={a.id} className="flex items-center gap-2.5 py-1">
                        {hasRated ? (
                          <CheckCircle className="size-4 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="size-4 text-border shrink-0" />
                        )}
                        <span className="text-xs text-foreground flex-1">
                          {toTitleCase(a.reviewer.name)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            hasRated
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {a.role} · {hasRated ? "Rated" : "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Final decision */}
              {cycle.decision && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                    Final Decision
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Slab</div>
                      <div className="font-bold text-foreground">
                        {cycle.decision.slab?.label ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Increment</div>
                      <div className="font-bold text-green-600 dark:text-green-400">
                        +₹{Number(cycle.decision.finalAmount).toLocaleString()}/yr
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {cycle.mom && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-xl p-2.5">
                  <FileText className="size-3.5 shrink-0" />
                  MOM available for this appraisal
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <FadeIn delay={0.25}>
          <Card className="border border-border shadow-sm bg-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              No active appraisal cycle. Admin will initiate one near your anniversary.
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
