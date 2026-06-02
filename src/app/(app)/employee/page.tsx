import Link from "next/link";
import { Fragment } from "react";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { daysUntilAnniversary } from "@/lib/business-days";
import { toTitleCase } from "@/lib/utils";
import {
  computeCycleStatus,
  allReviewersAvailable,
  isSelfAssessmentSubmitted,
} from "@/lib/workflow";
import { getSystemDate } from "@/lib/system-date";
import { monthStart } from "@/lib/kpi";
import { calendarFromDb, countWorkingMinutes } from "@/lib/working-hours";
import {
  requestPauseKpiTaskAction,
  startKpiTaskAction,
  submitKpiTaskAction,
} from "./kpi-actions";
import { Eye, Pencil } from "lucide-react";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { Button } from "@/components/ui/button";
import { KpiTaskTimeline } from "@/components/kpi-task-timeline";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
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
  BarChart3,
  AlertCircle,
  PauseCircle,
  RotateCcw,
  Timer,
  Upload,
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

const KPI_TASK_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WAITING_REVIEW: "Waiting for TL Review",
  REOPENED: "Reopened",
  PAUSED: "Paused",
  PARTIALLY_COMPLETED: "Partially Completed",
  CLOSED: "Closed",
};

function formatMinutes(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatDateTime(date: Date | null) {
  if (!date) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function latestEventReason(
  events: Array<{ eventType: string; reason: string | null; timestamp: Date }>,
  eventType: string,
) {
  return events
    .filter((event) => event.eventType === eventType && event.reason)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.reason ?? null;
}

export default async function EmployeeDashboard() {
  const session = await auth();
  if (!session?.user) return null;
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { salary: true },
  });
  if (!user) return null;

  const currentMonth = monthStart(new Date());
  const [recentNotifs, salaryRevisions, monthlyKpis, workingCalendar] = await Promise.all([
    prisma.notification.findMany({
      where: { organizationId, userId: user.id, read: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, message: true, link: true, createdAt: true },
    }),
    prisma.salaryRevision.findMany({
      where: { organizationId, userId: user.id },
      orderBy: { effectiveFrom: "desc" },
      take: 6,
      select: {
        id: true,
        revisedCtc: true,
        revisionPercentage: true,
        effectiveFrom: true,
        status: true,
      },
    }),
    prisma.kpiReview.findMany({
      where: { organizationId, userId: user.id },
      orderBy: { month: "desc" },
      take: 6,
      include: {
        department: { select: { name: true } },
        items: { orderBy: { sortOrder: "asc" } },
        kpiTasks: {
          orderBy: [{ assignedDate: "desc" }, { createdAt: "desc" }],
          include: {
            criterion: { select: { name: true, ruleType: true, ruleConfig: true } },
            events: {
              orderBy: { timestamp: "desc" },
              include: { actor: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.workingCalendar.findUnique({ where: { id: "default" } }),
  ]);

  const cycles = await prisma.appraisalCycle.findMany({
    where: { organizationId, userId: user.id },
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
        now,
      )
    : null;

  const allAvailable = cycle ? allReviewersAvailable(cycle.assignments) : false;
  const selfSubmitted = cycle?.self
    ? isSelfAssessmentSubmitted(cycle.self)
    : false;
  const deadlinePassed = cycle?.self ? now > cycle.self.editableUntil : false;
  const selfEditable =
    selfSubmitted && allAvailable && !deadlinePassed && !cycle?.self?.locked;

  const totalReviewers = cycle?.assignments.length ?? 0;
  const ratedCount = cycle?.ratings.length ?? 0;
  const allRated = totalReviewers > 0 && ratedCount === totalReviewers;
  const calendarConfig = calendarFromDb(workingCalendar);
  const currentKpi = monthlyKpis.find((review) => review.month.getTime() === currentMonth.getTime()) ?? null;
  const kpiTasks = currentKpi?.kpiTasks ?? [];
  const taskElapsed = new Map<string, number>();
  for (const task of kpiTasks) {
    let elapsed = task.timerElapsedMinutes;
    if (task.status === "IN_PROGRESS" || task.status === "REOPENED") {
      const lastStart = task.events.find((event) => event.eventType === "STARTED" || event.eventType === "RESUMED");
      if (lastStart) elapsed += countWorkingMinutes(lastStart.timestamp, now, calendarConfig);
    }
    taskElapsed.set(task.id, elapsed);
  }
  const kpiSummary = {
    currentScore: currentKpi?.monthlyPointScore ?? 0,
    averageRating: currentKpi?.averageRating ?? 0,
    completedTasks: kpiTasks.filter((task) => task.status === "CLOSED").length,
    pendingReview: kpiTasks.filter((task) => task.status === "WAITING_REVIEW").length,
    reopenedTasks: kpiTasks.filter((task) => task.status === "REOPENED").length,
    pausedTasks: kpiTasks.filter((task) => task.status === "PAUSED").length,
  };

  return (
    <div className="flex h-full max-h-full w-full max-w-7xl min-w-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden">
        <FadeIn>
          <div>
            <h1 className="ds-h1">My Appraisal</h1>
            <p className="ds-body mt-1">
              Joined {user.joiningDate.toLocaleDateString("en-IN")} ·{" "}
              {days === 0
                ? "Anniversary today!"
                : `${days} day${days === 1 ? "" : "s"} to next anniversary`}
            </p>
          </div>
        </FadeIn>

        {/* Stat widgets */}
        <StaggerList className="grid gap-4 lg:grid-cols-3">
          <StaggerItem>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm stat-teal hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-[10px] bg-[#0e8a95]/10 flex items-center justify-center">
                  <Calendar className="size-[18px] text-[#0e8a95]" />
                </div>
              </div>
              <div className="font-semibold text-foreground text-sm">
                {user.joiningDate.toLocaleDateString("en-IN")}
              </div>
              <div className="ds-small mt-1">Joining Date</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm stat-amber hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-[10px] bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Star className="size-[18px] text-amber-500" />
                </div>
              </div>
              <div className="ds-stat">{cycles.length}</div>
              <div className="ds-small mt-1">Total Cycles</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm stat-green hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-[10px] bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                  <TrendingUp className="size-[18px] text-green-500" />
                </div>
              </div>
              <div className="font-semibold text-foreground text-sm">
                {user.salary
                  ? `₹${Number(user.salary.grossAnnum).toLocaleString("en-IN")}/yr`
                  : "—"}
              </div>
              <div className="ds-small mt-1">Gross Salary</div>
            </div>
          </StaggerItem>
        </StaggerList>

        <FadeIn delay={0.16}>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BarChart3 className="size-4 text-primary" /> My KPI Tasks
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {currentKpi
                    ? `${currentKpi.department.name} - ${currentKpi.month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`
                    : "Current month KPI tasks will appear here once assigned."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                { label: "Current Month Score", value: kpiSummary.currentScore.toLocaleString("en-IN"), icon: BarChart3, tone: "stat-teal" },
                { label: "Average Rating", value: kpiSummary.averageRating.toFixed(2), icon: Star, tone: "stat-amber" },
                { label: "Completed Tasks", value: String(kpiSummary.completedTasks), icon: CheckCircle, tone: "stat-green" },
                { label: "Pending TL Review", value: String(kpiSummary.pendingReview), icon: Clock, tone: "stat-cyan" },
                { label: "Reopened Tasks", value: String(kpiSummary.reopenedTasks), icon: RotateCcw, tone: "stat-orange" },
                { label: "Paused Tasks", value: String(kpiSummary.pausedTasks), icon: PauseCircle, tone: "stat-red" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={`rounded-xl border border-border bg-card p-4 shadow-sm ${card.tone}`}>
                    <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{card.value}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{card.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Timer className="size-4 text-primary" /> Active Tasks
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Ratings are calculated by the system and finalized by TL
                </span>
              </div>

              {kpiTasks.length === 0 ? (
                <div className="flex min-h-[110px] items-center justify-center px-5 py-8 text-center text-xs text-muted-foreground">
                  No current month KPI tasks assigned.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1320px] text-xs">
                    <thead className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Task Name</th>
                        <th className="px-3 font-medium">KPI Criterion</th>
                        <th className="px-3 font-medium">Assigned Date</th>
                        <th className="px-3 font-medium">Due Date</th>
                        <th className="px-3 font-medium">Timer Status</th>
                        <th className="px-3 font-medium">Elapsed</th>
                        <th className="px-3 font-medium">Status</th>
                        <th className="px-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {kpiTasks.map((task) => {
                        const statusLabel = KPI_TASK_STATUS_LABELS[task.status] ?? "Assigned";
                        const reopenReason = latestEventReason(task.events, "REOPENED");
                        const closed = task.status === "CLOSED";
                        const timerStatus =
                          task.status === "IN_PROGRESS" || task.status === "REOPENED"
                            ? "Running"
                            : task.status === "WAITING_REVIEW"
                              ? "Frozen in TL Review"
                              : task.status === "PAUSED"
                                ? "Pause Requested"
                                : task.status === "CLOSED"
                                  ? "Stopped"
                                  : "Not Started";

                        return (
                          <Fragment key={task.id}>
                            <tr className="align-top">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-foreground">{task.name}</p>
                                {task.description && <p className="mt-1 text-[11px] text-muted-foreground">{task.description}</p>}
                                {reopenReason && (
                                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                                    <span className="font-semibold">TL reopen reason:</span> {reopenReason}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-4">{task.criterion.name}</td>
                              <td className="px-3 py-4">{formatDateTime(task.assignedDate)}</td>
                              <td className="px-3 py-4">{formatDateTime(task.dueDate)}</td>
                              <td className="px-3 py-4">{timerStatus}</td>
                              <td className="px-3 py-4 font-semibold text-foreground">{formatMinutes(taskElapsed.get(task.id) ?? task.timerElapsedMinutes)}</td>
                              <td className="px-3 py-4">
                                <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="px-3 py-4">
                                {closed ? (
                                  <div className="max-w-[260px] space-y-1.5">
                                    <p className="text-xs font-semibold text-primary">
                                      Final Rating: {task.finalRating?.toFixed(2) ?? "-"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {task.ratingExplanation ?? "Rating explanation will appear after TL closes the task."}
                                    </p>
                                  </div>
                                ) : task.status === "WAITING_REVIEW" ? (
                                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                    <Clock className="size-3.5" /> Waiting for TL review
                                  </div>
                                ) : task.status === "PAUSED" ? (
                                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                    <PauseCircle className="size-3.5" /> Pause request sent
                                  </div>
                                ) : task.status === "ASSIGNED" || task.status === "REOPENED" ? (
                                  <form action={startKpiTaskAction}>
                                    <input type="hidden" name="taskId" value={task.id} />
                                    <Button type="submit" size="sm" variant="outline">
                                      {task.status === "REOPENED" ? "Resume" : "Start"}
                                    </Button>
                                  </form>
                                ) : (
                                  <div className="space-y-2">
                                  <form action={submitKpiTaskAction} className="grid gap-2">
                                    <input type="hidden" name="taskId" value={task.id} />
                                    <input type="hidden" name="isPartial" value="false" />
                                    <div className="flex gap-2">
                                      <input
                                        name="fileUrl"
                                        defaultValue={task.fileUrl ?? ""}
                                        required={task.requiresFileUpload}
                                        placeholder={task.requiresFileUpload ? "Proof file link required" : "Proof file link"}
                                        className="h-8 w-44 rounded-md border border-border bg-background px-2 text-xs"
                                      />
                                      <input
                                        name="remarks"
                                        defaultValue={task.employeeRemarks ?? ""}
                                        placeholder="Remarks"
                                        className="h-8 w-36 rounded-md border border-border bg-background px-2 text-xs"
                                      />
                                      <Button type="submit" size="sm">
                                        <Upload className="size-3.5" /> Completed
                                      </Button>
                                    </div>
                                  </form>
                                  <form action={submitKpiTaskAction} className="flex gap-2">
                                    <input type="hidden" name="taskId" value={task.id} />
                                    <input type="hidden" name="isPartial" value="true" />
                                    <input
                                      name="fileUrl"
                                      defaultValue={task.fileUrl ?? ""}
                                      required={task.requiresFileUpload}
                                      placeholder={task.requiresFileUpload ? "Proof file link required" : "Proof file link"}
                                      className="h-8 w-44 rounded-md border border-border bg-background px-2 text-xs"
                                    />
                                    <input
                                      name="remarks"
                                      required
                                      placeholder="Partial reason required"
                                      className="h-8 w-40 rounded-md border border-border bg-background px-2 text-xs"
                                    />
                                    <Button type="submit" size="sm" variant="outline">
                                      Partially Completed
                                    </Button>
                                  </form>
                                  <form action={requestPauseKpiTaskAction} className="flex gap-2">
                                    <input type="hidden" name="taskId" value={task.id} />
                                    <input
                                      name="reason"
                                      required
                                      placeholder="Pause reason required"
                                      className="h-8 w-56 rounded-md border border-border bg-background px-2 text-xs"
                                    />
                                    <Button type="submit" size="sm" variant="outline">
                                      <AlertCircle className="size-3.5" /> Pause Request
                                    </Button>
                                  </form>
                                  </div>
                                )}
                              </td>
                            </tr>
                            <tr className="bg-muted/10">
                              <td colSpan={8} className="px-4 py-3">
                                <KpiTaskTimeline events={task.events} compact />
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </FadeIn>

        {/* Notifications */}
        <FadeIn delay={0.18}>
          <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Bell className="size-3.5" /> Unread Notifications
              </span>
              <Link
                href="/notifications"
                className="text-[11px] text-[#0e8a95] hover:underline"
              >
                View all
              </Link>
            </div>
            {recentNotifs.length === 0 ? (
              <div className="flex min-h-[80px] items-center justify-center px-5 py-6 text-center text-xs text-muted-foreground">
                No unread notifications.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentNotifs.map((n) => (
                  <div key={n.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="size-1.5 rounded-full bg-[#0e8a95] shrink-0 mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {n.createdAt.toLocaleString("en-IN")}
                      </p>
                    </div>
                    {n.link && (
                      <Link
                        href={n.link}
                        className="text-[11px] text-[#0e8a95] shrink-0 hover:underline"
                      >
                        View
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeIn>

        {/* Salary revision history */}
        {salaryRevisions.length > 0 && (
          <FadeIn delay={0.2}>
            <div
              className="border border-border rounded-xl bg-card shadow-sm overflow-hidden"
              style={{ borderTop: "3px solid #22c55e" }}
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <TrendingUp className="size-3.5" /> Salary Revision History
                </span>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {salaryRevisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground">
                        {Number(rev.revisedCtc) >= 100000
                          ? `₹${(Number(rev.revisedCtc) / 100000).toFixed(2)}L`
                          : `₹${Number(rev.revisedCtc).toLocaleString("en-IN")}`}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {rev.effectiveFrom.toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    {rev.revisionPercentage !== null && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${Number(rev.revisionPercentage) >= 0 ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"}`}
                      >
                        {Number(rev.revisionPercentage) >= 0 ? "+" : ""}
                        {Number(rev.revisionPercentage).toFixed(1)}%
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${rev.status === "Approved" ? "text-green-700 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/30" : rev.status === "Pending" ? "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/30" : "text-muted-foreground border-border bg-muted"}`}
                    >
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
              Your appraisal cycle is approaching within a week of your
              anniversary.
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
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Users className="size-3.5" /> Reviewer Availability
                    </div>
                    <div className="space-y-1">
                      {cycle.assignments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2.5 py-1.5"
                        >
                          {a.availability === "AVAILABLE" ? (
                            <CheckCircle className="size-4 text-green-500 shrink-0" />
                          ) : a.availability === "NOT_AVAILABLE" ? (
                            <Circle className="size-4 text-red-400 shrink-0" />
                          ) : (
                            <Clock className="size-4 text-amber-400 shrink-0" />
                          )}
                          <span className="text-sm text-foreground flex-1">
                            <Link
                              href={`/workspace/hrms/employees/${a.reviewer.id}/assign`}
                              className="transition-colors hover:text-primary hover:underline"
                            >
                              {toTitleCase(a.reviewer.name)}
                            </Link>
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
                            Deadline:{" "}
                            {cycle.self.editableUntil.toLocaleString("en-IN")}
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
                          {Object.keys(cycle.self.answers as object).length > 0
                            ? "Continue"
                            : "Start"}
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
                {cycle.assignments.length > 0 &&
                  allAvailable &&
                  selfSubmitted && (
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Star className="size-3.5" /> Rating Progress
                        </div>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                            allRated
                              ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {allRated
                            ? "All Rated"
                            : `${ratedCount} / ${totalReviewers} Rated`}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {cycle.assignments.map((a) => {
                          const hasRated = cycle.ratings.some(
                            (r) => r.reviewerId === a.reviewer.id,
                          );
                          return (
                            <div
                              key={a.id}
                              className="flex items-center gap-2.5 py-1.5"
                            >
                              {hasRated ? (
                                <CheckCircle className="size-4 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="size-4 text-border shrink-0" />
                              )}
                              <span className="text-sm text-foreground flex-1">
                                <Link
                                  href={`/workspace/hrms/employees/${a.reviewer.id}/assign`}
                                  className="transition-colors hover:text-primary hover:underline"
                                >
                                  {toTitleCase(a.reviewer.name)}
                                </Link>
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
                            width:
                              totalReviewers > 0
                                ? `${(ratedCount / totalReviewers) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  )}

                {/* Meeting scheduled */}
                {cycle.scheduledDate && !cycle.decision && (
                  <div className="px-5 py-4">
                    <div className="border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">
                        Meeting Scheduled
                      </p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">
                        {new Date(cycle.scheduledDate).toLocaleDateString(
                          "en-IN",
                          {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Decision under review */}
                {cycle.decision && cycle.moms.length === 0 && (
                  <div className="px-5 py-4">
                    <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                        Appraisal Under Review
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {cycle.scheduledDate ? (
                          <>
                            Meeting scheduled for{" "}
                            <strong>
                              {new Date(cycle.scheduledDate).toLocaleDateString(
                                "en-IN",
                                {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                },
                              )}
                            </strong>
                            . Increment details will be shared after the
                            meeting.
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
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                        Final Decision
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">
                            Slab
                          </div>
                          <div className="font-bold text-foreground text-lg">
                            {cycle.decision.slab?.label ?? "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">
                            Increment
                          </div>
                          <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                            +₹
                            {Number(cycle.decision.finalAmount).toLocaleString(
                              "en-IN",
                            )}
                            /yr
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
                        cycle.arrear.status === "APPROVED" ||
                        cycle.arrear.status === "PAID"
                          ? "bg-[#0e8a95]/5 border-[#0e8a95]/30"
                          : cycle.arrear.status === "PENDING_APPROVAL"
                            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                            : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold ${
                          cycle.arrear.status === "APPROVED" ||
                          cycle.arrear.status === "PAID"
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
                          <div className="text-xs text-muted-foreground">
                            Arrear Days
                          </div>
                          <div className="font-bold text-foreground">
                            {cycle.arrear.arrearDays} days
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Arrear Amount
                          </div>
                          <div className="font-bold text-[#0e8a95]">
                            ₹
                            {Number(cycle.arrear.arrearAmount).toLocaleString(
                              "en-IN",
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Period
                          </div>
                          <div className="text-xs text-foreground">
                            {new Date(
                              cycle.arrear.periodFrom,
                            ).toLocaleDateString("en-IN")}{" "}
                            —{" "}
                            {new Date(cycle.arrear.periodTo).toLocaleDateString(
                              "en-IN",
                            )}
                          </div>
                        </div>
                        {cycle.arrear.payoutMonth && (
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Payout Month
                            </div>
                            <div className="text-xs font-medium text-foreground">
                              {new Date(
                                cycle.arrear.payoutMonth,
                              ).toLocaleDateString("en-IN", {
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
              No active appraisal cycle. Admin will initiate one near your
              anniversary.
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
