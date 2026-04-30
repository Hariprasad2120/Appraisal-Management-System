import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { daysUntilAnniversary } from "@/lib/business-days";
import { toTitleCase } from "@/lib/utils";
import {
  computeCycleStatus,
  allReviewersAvailable,
  isSelfAssessmentSubmitted,
} from "@/lib/workflow";
import { getSystemDate } from "@/lib/system-date";
import { Eye, Pencil } from "lucide-react";
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
  Bell,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING_SELF: "Self-Assessment Pending",
  SELF_SUBMITTED: "Self-Assessment Submitted",
  AWAITING_AVAILABILITY: "Reviewers Confirming Availability",
  RATING_IN_PROGRESS: "Rating In Progress",
  RATINGS_COMPLETE: "Ratings Complete",
  MANAGEMENT_REVIEW: "Management Review",
  DATE_VOTING: "Scheduling Meeting",
  SCHEDULED: "Meeting Scheduled",
  DECIDED: "Decision Finalised",
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

  const [recentNotifs, salaryRevisions] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, read: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, message: true, link: true, createdAt: true },
    }),
    prisma.salaryRevision.findMany({
      where: { userId: user.id },
      orderBy: { effectiveFrom: "desc" },
      take: 6,
      select: { id: true, revisedCtc: true, revisionPercentage: true, effectiveFrom: true, status: true },
    }),
  ]);

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
      moms: { where: { role: "MANAGEMENT" } },
      arrear: true,
    },
  });

  const cycle = cycles[0] ?? null;
  const days = daysUntilAnniversary(user.joiningDate, new Date());
  const now = await getSystemDate();
  const displayStatus = cycle
    ? computeCycleStatus(
        {
          id: cycle.id,
          status: cycle.status,
          ratingDeadline: cycle.ratingDeadline,
          self: cycle.self,
          assignments: cycle.assignments,
          ratings: cycle.ratings,
        },
        now
      )
    : null;

  const allAvailable = cycle ? allReviewersAvailable(cycle.assignments) : false;
  const selfSubmitted = cycle?.self ? isSelfAssessmentSubmitted(cycle.self) : false;
  const deadlinePassed = cycle?.self ? now > cycle.self.editableUntil : false;
  const selfEditable = selfSubmitted && allAvailable && !deadlinePassed && !(cycle?.self?.locked);

  const totalReviewers = cycle?.assignments.length ?? 0;
  const ratedCount = cycle?.ratings.length ?? 0;
  const allRated = totalReviewers > 0 && ratedCount === totalReviewers;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <FadeIn>
        <div>
          <h1 className="ds-h1">Welcome, {toTitleCase(user.name)}</h1>
          <p className="ds-body mt-1">
            Joined {user.joiningDate.toLocaleDateString("en-IN")} ·{" "}
            {days === 0
              ? "Anniversary today!"
              : `${days} day${days === 1 ? "" : "s"} to next anniversary`}
          </p>
        </div>
      </FadeIn>

      {/* Stat widgets */}
      <StaggerList className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm stat-teal hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="size-9 rounded-[10px] bg-[#0e8a95]/10 flex items-center justify-center">
                <Calendar className="size-[18px] text-[#0e8a95]" />
              </div>
              <div className="ds-label">Joining Date</div>
            </div>
            <div className="font-semibold text-foreground text-sm">
              {user.joiningDate.toLocaleDateString("en-IN")}
            </div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm stat-amber hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="size-9 rounded-[10px] bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Star className="size-[18px] text-amber-500" />
              </div>
              <div className="ds-label">Total Cycles</div>
            </div>
            <div className="ds-stat">{cycles.length}</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm stat-green hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="size-9 rounded-[10px] bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="size-[18px] text-green-500" />
              </div>
              <div className="ds-label">Gross Salary</div>
            </div>
            <div className="font-semibold text-foreground text-sm">
              {user.salary
                ? `₹${Number(user.salary.grossAnnum).toLocaleString("en-IN")}/yr`
                : "—"}
            </div>
          </div>
        </StaggerItem>
      </StaggerList>

      {/* Notifications */}
      {recentNotifs.length > 0 && (
        <FadeIn delay={0.18}>
          <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Bell className="size-3.5" /> Notifications
              </span>
              <Link href="/notifications" className="text-[11px] text-[#0e8a95] hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentNotifs.map((n) => (
                <div key={n.id} className="px-5 py-3 flex items-start gap-3">
                  <span className="size-1.5 rounded-full bg-[#0e8a95] shrink-0 mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {n.createdAt.toLocaleString("en-IN")}
                    </p>
                  </div>
                  {n.link && (
                    <Link href={n.link} className="text-[11px] text-[#0e8a95] shrink-0 hover:underline">
                      View
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Salary revision history */}
      {salaryRevisions.length > 0 && (
        <FadeIn delay={0.2}>
          <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden" style={{ borderTop: "3px solid #22c55e" }}>
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <TrendingUp className="size-3.5" /> Salary Revision History
              </span>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {salaryRevisions.map((rev) => (
                <div key={rev.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">
                      {Number(rev.revisedCtc) >= 100000
                        ? `₹${(Number(rev.revisedCtc) / 100000).toFixed(2)}L`
                        : `₹${Number(rev.revisedCtc).toLocaleString("en-IN")}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {rev.effectiveFrom.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </div>
                  </div>
                  {rev.revisionPercentage !== null && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${Number(rev.revisionPercentage) >= 0 ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"}`}>
                      {Number(rev.revisionPercentage) >= 0 ? "+" : ""}{Number(rev.revisionPercentage).toFixed(1)}%
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${rev.status === "Approved" ? "text-green-700 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/30" : rev.status === "Pending" ? "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/30" : "text-muted-foreground border-border bg-muted"}`}>
                    {rev.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {days <= 7 && (
        <FadeIn delay={0.22}>
          <div className="border border-[#0e8a95]/30 bg-[#0e8a95]/5 rounded-xl p-4 text-sm text-[#0e8a95] dark:text-[#00cec4]">
            Your appraisal cycle is approaching within a week of your anniversary.
          </div>
        </FadeIn>
      )}

      {/* Current cycle — consolidated view */}
      {cycle ? (
        <FadeIn delay={0.25}>
          <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-semibold text-foreground">
                Current Appraisal — {cycle.type}
              </span>
              <span className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1 font-medium border border-primary/20">
                {STATUS_LABELS[displayStatus ?? ""] ?? displayStatus}
              </span>
            </div>

            <div className="divide-y divide-border">

              {/* Reviewer Availability */}
              {cycle.assignments.length > 0 && (
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Users className="size-3.5" /> Reviewer Availability
                  </div>
                  <div className="space-y-1">
                    {cycle.assignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2.5 py-1.5">
                        {a.availability === "AVAILABLE" ? (
                          <CheckCircle className="size-4 text-green-500 shrink-0" />
                        ) : a.availability === "NOT_AVAILABLE" ? (
                          <Circle className="size-4 text-red-400 shrink-0" />
                        ) : (
                          <Clock className="size-4 text-amber-400 shrink-0" />
                        )}
                        <span className="text-sm text-foreground flex-1">
                          {toTitleCase(a.reviewer.name)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            a.availability === "AVAILABLE"
                              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                              : a.availability === "NOT_AVAILABLE"
                              ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
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
                </div>
              )}

              {/* Self-Assessment */}
              {cycle.self && (
                <div className="px-5 py-4">
                  <div
                    className={`rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                      selfSubmitted
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                        : allAvailable
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                        : "bg-muted border-border"
                    }`}
                  >
                    <div>
                      <p
                        className={`font-semibold text-sm ${
                          selfSubmitted
                            ? "text-green-700 dark:text-green-400"
                            : allAvailable
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        Self-Assessment —{" "}
                        {selfSubmitted
                          ? "Submitted"
                          : allAvailable
                          ? "Pending"
                          : "Locked (awaiting reviewers)"}
                      </p>
                      {!selfSubmitted && allAvailable && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Deadline: {cycle.self.editableUntil.toLocaleString("en-IN")}
                        </p>
                      )}
                      {!allAvailable && !selfSubmitted && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Opens once all reviewers confirm availability
                        </p>
                      )}
                    </div>

                    {!selfSubmitted && allAvailable && (
                      <Link
                        href={`/employee/self/${cycle.id}`}
                        className="flex items-center gap-1 bg-amber-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-amber-600 transition-colors w-fit shrink-0"
                      >
                        {Object.keys(cycle.self.answers as object).length > 0 ? "Continue" : "Start"}
                        <ChevronRight className="size-3" />
                      </Link>
                    )}
                    {selfSubmitted && selfEditable && (
                      <Link
                        href={`/employee/self/${cycle.id}`}
                        className="flex items-center gap-1.5 bg-[#0e8a95] text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-[#0ea5b0] transition-colors w-fit shrink-0"
                      >
                        <Pencil className="size-3" /> Edit
                      </Link>
                    )}
                    {selfSubmitted && !selfEditable && (
                      <Link
                        href={`/employee/self/${cycle.id}`}
                        className="flex items-center gap-1.5 bg-muted text-muted-foreground rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-muted/80 transition-colors w-fit shrink-0 border border-border"
                      >
                        <Eye className="size-3" /> View
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Rating Progress */}
              {cycle.assignments.length > 0 && allAvailable && selfSubmitted && (
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      <Star className="size-3.5" /> Rating Progress
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        allRated
                          ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {allRated ? "All Rated" : `${ratedCount} / ${totalReviewers} Rated`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {cycle.assignments.map((a) => {
                      const hasRated = cycle.ratings.some((r) => r.reviewerId === a.reviewer.id);
                      return (
                        <div key={a.id} className="flex items-center gap-2.5 py-1.5">
                          {hasRated ? (
                            <CheckCircle className="size-4 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="size-4 text-border shrink-0" />
                          )}
                          <span className="text-sm text-foreground flex-1">
                            {toTitleCase(a.reviewer.name)}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                              hasRated
                                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {a.role} · {hasRated ? "Rated" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0e8a95] transition-all"
                      style={{
                        width: totalReviewers > 0 ? `${(ratedCount / totalReviewers) * 100}%` : "0%",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Meeting scheduled */}
              {cycle.scheduledDate && !cycle.decision && (
                <div className="px-5 py-4">
                  <div className="border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-widest mb-1">
                      Meeting Scheduled
                    </p>
                    <p className="text-sm text-purple-600 dark:text-purple-400">
                      {new Date(cycle.scheduledDate).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Decision under review */}
              {cycle.decision && cycle.moms.length === 0 && (
                <div className="px-5 py-4">
                  <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-1">
                      Appraisal Under Review
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {cycle.scheduledDate ? (
                        <>
                          Meeting scheduled for{" "}
                          <strong>
                            {new Date(cycle.scheduledDate).toLocaleDateString("en-IN", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </strong>
                          . Increment details will be shared after the meeting.
                        </>
                      ) : (
                        "Your appraisal meeting is being scheduled. Increment details will be shared after the meeting."
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Final decision */}
              {cycle.decision && cycle.moms.length > 0 && (
                <div className="px-5 py-4">
                  <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-widest">
                      Final Decision
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Slab</div>
                        <div className="font-bold text-foreground text-lg">
                          {cycle.decision.slab?.label ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Increment</div>
                        <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                          +₹{Number(cycle.decision.finalAmount).toLocaleString("en-IN")}/yr
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MOM indicator */}
              {cycle.moms.length > 0 && (
                <div className="px-5 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2.5 border border-border">
                    <FileText className="size-3.5 shrink-0" />
                    Minutes of Meeting (MOM) available for this appraisal
                  </div>
                </div>
              )}

              {/* Arrear */}
              {cycle.moms.length > 0 && cycle.arrear && (
                <div className="px-5 py-4">
                  <div
                    className={`rounded-xl border p-4 space-y-3 ${
                      cycle.arrear.status === "APPROVED" || cycle.arrear.status === "PAID"
                        ? "bg-[#0e8a95]/5 border-[#0e8a95]/30"
                        : cycle.arrear.status === "PENDING_APPROVAL"
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase tracking-widest ${
                        cycle.arrear.status === "APPROVED" || cycle.arrear.status === "PAID"
                          ? "text-[#0e8a95]"
                          : cycle.arrear.status === "PENDING_APPROVAL"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-red-700 dark:text-red-400"
                      }`}
                    >
                      Arrear —{" "}
                      {cycle.arrear.status === "PENDING_APPROVAL"
                        ? "Pending Management Approval"
                        : cycle.arrear.status === "APPROVED"
                        ? "Approved"
                        : cycle.arrear.status === "PAID"
                        ? "Credited"
                        : "Not Approved"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Arrear Days</div>
                        <div className="font-bold text-foreground">{cycle.arrear.arrearDays} days</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Arrear Amount</div>
                        <div className="font-bold text-[#0e8a95]">
                          ₹{Number(cycle.arrear.arrearAmount).toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Period</div>
                        <div className="text-xs text-foreground">
                          {new Date(cycle.arrear.periodFrom).toLocaleDateString("en-IN")} —{" "}
                          {new Date(cycle.arrear.periodTo).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                      {cycle.arrear.payoutMonth && (
                        <div>
                          <div className="text-xs text-muted-foreground">Payout Month</div>
                          <div className="text-xs font-medium text-foreground">
                            {new Date(cycle.arrear.payoutMonth).toLocaleDateString("en-IN", {
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.25}>
          <div className="border border-border rounded-xl bg-card shadow-sm py-12 text-center text-muted-foreground text-sm">
            No active appraisal cycle. Admin will initiate one near your anniversary.
          </div>
        </FadeIn>
      )}
    </div>
  );
}
