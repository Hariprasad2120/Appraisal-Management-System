import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getVisibleAverageForReviewer,
  isRatingOpen,
  computeCycleStatus,
} from "@/lib/workflow";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import {
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Users,
  ClipboardList,
  CalendarDays,
  Bell,
  IndianRupee,
  TrendingUp,
  Star,
  ArrowRight,
  Ticket,
} from "lucide-react";
import { getSystemDate } from "@/lib/system-date";

export default async function ReviewerDashboard() {
  const session = await auth();
  if (!session?.user) return null;

  const now = await getSystemDate();

  const [assignments, reviewer, recentNotifs, myOwnCycles, activeTickets] =
    await Promise.all([
      prisma.cycleAssignment.findMany({
        where: { reviewerId: session.user.id },
        include: {
          cycle: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
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
        orderBy: { assignedAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          designation: true,
          department: true,
          joiningDate: true,
          currentSalary: true,
          salary: true,
          salaryRevisions: {
            orderBy: { effectiveFrom: "desc" },
            take: 8,
            select: {
              id: true,
              grossAnnum: true,
              ctcAnnum: true,
              revisedCtc: true,
              revisionPercentage: true,
              effectiveFrom: true,
              status: true,
            },
          },
        },
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id, read: false },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          message: true,
          link: true,
          createdAt: true,
          type: true,
        },
      }),
      prisma.appraisalCycle.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          self: {
            select: {
              status: true,
              editableUntil: true,
              submittedAt: true,
              locked: true,
            },
          },
          assignments: { select: { availability: true, role: true } },
          ratings: { select: { reviewerId: true, averageScore: true } },
          decision: {
            select: { finalAmount: true, finalRating: true, decidedAt: true },
          },
        },
      }),
      prisma.ticket.findMany({
        where: {
          raisedById: session.user.id,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          updatedAt: true,
        },
      }),
    ]);

  const completed = assignments.filter((a) =>
    a.cycle.ratings.some((r) => r.reviewerId === session.user.id),
  );
  const pendingAction = assignments.filter((a) => a.availability === "PENDING");
  const pendingReview = assignments.filter(
    (a) =>
      a.availability === "AVAILABLE" &&
      isRatingOpen(a.cycle, now) &&
      !a.cycle.ratings.some((r) => r.reviewerId === session.user.id),
  );
  const isHrReviewer =
    session.user.role === "HR" || session.user.secondaryRole === "HR";
  const hrMeetings = assignments
    .filter(
      (a) =>
        a.role === "HR" &&
        (a.cycle.scheduledDate ||
          a.cycle.tentativeDate1 ||
          a.cycle.tentativeDate2),
    )
    .sort((a, b) => {
      const aDate =
        a.cycle.scheduledDate ??
        a.cycle.tentativeDate1 ??
        a.cycle.tentativeDate2;
      const bDate =
        b.cycle.scheduledDate ??
        b.cycle.tentativeDate1 ??
        b.cycle.tentativeDate2;
      return (aDate?.getTime() ?? 0) - (bDate?.getTime() ?? 0);
    });

  const myOwnCycle = myOwnCycles[0] ?? null;
  const ownStatus = myOwnCycle ? computeCycleStatus(myOwnCycle, now) : null;

  const salaryRevisions = reviewer?.salaryRevisions ?? [];
  const latestAssignments = assignments.slice(0, 5);
  return (
    <div className="flex h-full max-h-full w-full max-w-7xl min-w-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden">
        {/* Greeting header */}
        <FadeIn>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="ds-h1">Reviewer Dashboard</h1>
              <p className="ds-body mt-1">
                {reviewer?.designation && `${reviewer.designation} · `}
                {reviewer?.department ?? ""}
              </p>
            </div>
            {recentNotifs.length > 0 && (
              <Link
                href="/notifications"
                className="relative inline-flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl hover:bg-amber-100 transition-colors"
              >
                <Bell className="size-3.5" />
                {recentNotifs.length} unread notification
                {recentNotifs.length !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        </FadeIn>

        {/* Stat widgets */}
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatWidget
              label="Total Assigned"
              value={assignments.length}
              accent="#0e8a95"
              iconBg="rgba(14,137,149,0.1)"
              icon={<Users className="size-4 text-[#0e8a95]" />}
            />
            <StatWidget
              label="Action Required"
              value={pendingAction.length}
              accent="#ffaa2d"
              iconBg="rgba(255,170,45,0.1)"
              icon={<AlertCircle className="size-4 text-amber-500" />}
            />
            <StatWidget
              label="Pending Rating"
              value={pendingReview.length}
              accent="#ff8333"
              iconBg="rgba(255,131,51,0.1)"
              icon={<ClipboardList className="size-4 text-orange-500" />}
            />
            <StatWidget
              label="Completed"
              value={completed.length}
              accent="#22c55e"
              iconBg="rgba(34,197,94,0.1)"
              icon={<CheckCircle className="size-4 text-green-500" />}
            />
          </div>
        </FadeIn>

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 gap-5 items-start">
          {/* Left column */}
          <div className="min-w-0 space-y-5">
            {/* Active tickets */}
            {activeTickets.length > 0 && (
              <FadeIn delay={0.1}>
                <SectionCard
                  title="Open Support Tickets"
                  icon={<Ticket className="size-3.5" />}
                  action={
                    <Link
                      href="/tickets"
                      className="text-[11px] text-[#0e8a95] hover:underline"
                    >
                      View all
                    </Link>
                  }
                >
                  <div className="divide-y divide-border">
                    {activeTickets.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tickets/${t.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <span
                          className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            t.priority === "URGENT"
                              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                              : t.priority === "HIGH"
                                ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"
                                : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {t.priority}
                        </span>
                        <span className="text-sm text-foreground flex-1 truncate">
                          {t.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {t.status.replace("_", " ")}
                        </span>
                        <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                </SectionCard>
              </FadeIn>
            )}

            {/* Assignments table */}
            <FadeIn delay={0.12}>
              <SectionCard
                title="Latest Assigned Appraisals"
                icon={<Users className="size-3.5" />}
                headerExtra={
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                    <Legend dot="bg-amber-400" label="Action Required" />
                    <Legend dot="bg-[#0e8a95]" label="Rating Open" />
                    <Legend dot="bg-green-500" label="Completed" />
                    <Legend
                      dot="bg-slate-300 dark:bg-slate-600"
                      label="Waiting / N/A"
                    />
                  </div>
                }
                action={
                  <Link
                    href="/assignments"
                    className="text-[11px] text-[#0e8a95] hover:underline"
                  >
                    View all
                  </Link>
                }
              >
                {latestAssignments.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    No assignments yet. Admin will assign you when a cycle
                    opens.
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          {[
                            "#",
                            "Employee",
                            "Cycle",
                            "Role",
                            "Status",
                            "Progress",
                            "Score",
                            "Deadline",
                            "Meeting",
                            "Action",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-2 py-2.5 ds-label whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {latestAssignments.map((a, idx) => (
                          <ReviewRow
                            key={a.id}
                            idx={idx + 1}
                            assignment={a}
                            sessionUserId={session.user.id}
                            now={now}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </FadeIn>

            {/* Own appraisal */}
            {myOwnCycle && (
              <FadeIn delay={0.15}>
                <SectionCard
                  title="My Own Appraisal"
                  icon={<Star className="size-3.5" />}
                  accent="#ffaa2d"
                  action={
                    <Link
                      href="/employee"
                      className="inline-flex items-center gap-1 text-[11px] text-[#0e8a95] hover:underline"
                    >
                      View full <ArrowRight className="size-3" />
                    </Link>
                  }
                >
                  <div className="px-5 pb-4 pt-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Cycle type
                      </span>
                      <span className="text-xs font-semibold text-[#0e8a95]">
                        {myOwnCycle.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Status
                      </span>
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {ownStatus?.replace(/_/g, " ") ?? "—"}
                      </span>
                    </div>
                    {myOwnCycle.self && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Self-assessment
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {myOwnCycle.self.status ?? "DRAFT"}
                        </span>
                      </div>
                    )}
                    {myOwnCycle.decision && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Final Rating
                        </span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">
                          {myOwnCycle.decision.finalRating.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="pt-1">
                      <Link
                        href={`/employee/self/${myOwnCycle.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#0e8a95] text-white px-3 py-1.5 rounded-lg hover:bg-[#0ea5b0] transition-colors"
                      >
                        Open Self-Assessment <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </SectionCard>
              </FadeIn>
            )}
          </div>

          {/* Right column */}
          <div className="grid min-w-0 auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-4">
            {isHrReviewer && (
              <FadeIn delay={0.06}>
                <SectionCard
                  title="Upcoming Meetings"
                  icon={<CalendarDays className="size-3.5" />}
                  action={
                    <span className="text-[11px] text-muted-foreground">
                      {hrMeetings.length} active
                    </span>
                  }
                >
                  {hrMeetings.length === 0 ? (
                    <div className="flex min-h-[80px] items-center justify-center px-5 py-6 text-center text-xs text-muted-foreground">
                      No meeting dates have been selected yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {hrMeetings.slice(0, 5).map((assignment) => {
                        const meetingDate = assignment.cycle.scheduledDate;
                        const firstOption = assignment.cycle.tentativeDate1;
                        const secondOption = assignment.cycle.tentativeDate2;
                        return (
                          <div key={assignment.id} className="px-5 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/employees/${assignment.cycle.user.id}/assign`}
                                  className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                                >
                                  {toTitleCase(assignment.cycle.user.name)}
                                </Link>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {meetingDate
                                    ? meetingDate.toLocaleDateString("en-IN", {
                                        weekday: "short",
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "Management proposed meeting dates"}
                                </p>
                                {!meetingDate &&
                                  (firstOption || secondOption) && (
                                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                                      {[firstOption, secondOption]
                                        .filter(Boolean)
                                        .map((date) =>
                                          date!.toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                          }),
                                        )
                                        .join(" / ")}
                                    </p>
                                  )}
                              </div>
                              <Link
                                href={`/reviewer/${assignment.cycle.id}/schedule`}
                                className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                  meetingDate
                                    ? "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                                    : "bg-[#0e8a95] text-white hover:bg-[#0ea5b0]"
                                }`}
                              >
                                {meetingDate ? "View" : "Confirm"}
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </FadeIn>
            )}

            {/* Compact notifications */}
            <FadeIn delay={0.08}>
              <SectionCard
                title="Unread Notifications"
                icon={<Bell className="size-3.5" />}
                action={
                  <Link
                    href="/notifications"
                    className="text-[11px] text-[#0e8a95] hover:underline"
                  >
                    View all
                  </Link>
                }
              >
                {recentNotifs.length === 0 ? (
                  <div className="flex min-h-[80px] items-center justify-center px-5 py-6 text-center text-xs text-muted-foreground">
                    No unread notifications.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentNotifs.map((n) => (
                      <div
                        key={n.id}
                        className="px-5 py-3 flex items-start gap-2.5"
                      >
                        <span className="size-1.5 rounded-full bg-[#0e8a95] shrink-0 mt-1.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground line-clamp-2 leading-snug">
                            {n.message}
                          </p>
                          {n.link && (
                            <Link
                              href={n.link}
                              className="text-[10px] text-[#0e8a95] hover:underline mt-0.5 block"
                            >
                              View →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </FadeIn>

            {/* Salary details */}
            {reviewer?.salary && (
              <FadeIn delay={0.1}>
                <SectionCard
                  title="Salary Details"
                  icon={<IndianRupee className="size-3.5" />}
                  accent="#0e8a95"
                >
                  <div className="px-5 pb-4 pt-1 grid grid-cols-2 gap-3">
                    <SalaryField
                      label="CTC (Annual)"
                      value={Number(reviewer.salary.ctcAnnum)}
                    />
                    <SalaryField
                      label="Gross (Annual)"
                      value={Number(reviewer.salary.grossAnnum)}
                    />
                    <SalaryField
                      label="Basic"
                      value={Number(reviewer.salary.basic)}
                    />
                    <SalaryField
                      label="HRA"
                      value={Number(reviewer.salary.hra)}
                    />
                    {Number(reviewer.salary.conveyance) > 0 && (
                      <SalaryField
                        label="Conveyance"
                        value={Number(reviewer.salary.conveyance)}
                      />
                    )}
                    {Number(reviewer.salary.fixedAllowance) > 0 && (
                      <SalaryField
                        label="Fixed Allowance"
                        value={Number(reviewer.salary.fixedAllowance)}
                      />
                    )}
                  </div>
                </SectionCard>
              </FadeIn>
            )}

            {/* Salary revision history */}
            {salaryRevisions.length > 0 && (
              <FadeIn delay={0.14}>
                <SectionCard
                  title="Salary Revision History"
                  icon={<TrendingUp className="size-3.5" />}
                  accent="#22c55e"
                >
                  <div className="px-5 pb-4 pt-1 space-y-2.5">
                    {salaryRevisions.map((rev) => (
                      <div
                        key={rev.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground">
                            {formatCurrency(Number(rev.revisedCtc))}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Effective{" "}
                            {rev.effectiveFrom.toLocaleDateString("en-IN", {
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                        {rev.revisionPercentage !== null && (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              Number(rev.revisionPercentage) >= 0
                                ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
                                : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                            }`}
                          >
                            {Number(rev.revisionPercentage) >= 0 ? "+" : ""}
                            {Number(rev.revisionPercentage).toFixed(1)}%
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            rev.status === "Approved"
                              ? "text-green-700 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/30"
                              : rev.status === "Pending"
                                ? "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/30"
                                : "text-muted-foreground border-border bg-muted"
                          }`}
                        >
                          {rev.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </FadeIn>
            )}

            {/* Quick links */}
            <FadeIn delay={0.18}>
              <SectionCard
                title="Quick Links"
                icon={<ArrowRight className="size-3.5" />}
              >
                <div className="px-5 pb-4 pt-1 flex flex-col gap-2">
                  {[
                    { href: "/assignments", label: "All Assignments" },
                    { href: "/employee", label: "My Appraisal" },
                    { href: "/tickets", label: "Support Tickets" },
                    { href: "/history", label: "Appraisal History" },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center justify-between text-sm text-foreground hover:text-[#0e8a95] py-1.5 border-b border-border/50 last:border-0 transition-colors"
                    >
                      {l.label}
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </SectionCard>
            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function SalaryField({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-lg p-2.5 border border-border">
      <div className="ds-label mb-1">{label}</div>
      <div className="text-sm font-semibold text-foreground">
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  accent,
  action,
  headerExtra,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  accent?: string;
  action?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="h-full min-h-[132px] overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      style={accent ? { borderTop: `3px solid ${accent}` } : undefined}
    >
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </span>
        {headerExtra}
        {action}
      </div>
      {children}
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full inline-block ${dot}`} />
      {label}
    </span>
  );
}

function StatWidget({
  label,
  value,
  accent,
  iconBg,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="h-full bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="size-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
      </div>
      <div className="ds-stat">{value}</div>
      <div className="ds-small mt-1">{label}</div>
    </div>
  );
}

function RowLinkCell({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <td className="p-0">
      <Link href={href} className={`block h-full px-2 py-3 ${className}`}>
        {children}
      </Link>
    </td>
  );
}

type AssignmentWithCycle = {
  id: string;
  role: string;
  availability: string;
  assignedAt: Date;
  cycle: {
    id: string;
    type: string;
    user: {
      id: string;
      name: string;
      department: string | null;
      designation?: string | null;
    };
    scheduledDate: Date | null;
    tentativeDate1: Date | null;
    tentativeDate2: Date | null;
    self: {
      editableUntil: Date;
      submittedAt: Date | null;
      locked: boolean;
    } | null;
    assignments: { availability: "PENDING" | "AVAILABLE" | "NOT_AVAILABLE" }[];
    ratings: { reviewerId: string; averageScore: number }[];
  };
};

function ReviewRow({
  idx,
  assignment,
  sessionUserId,
  now,
}: {
  idx: number;
  assignment: AssignmentWithCycle;
  sessionUserId: string;
  now: Date;
}) {
  const ratingOpen = isRatingOpen(assignment.cycle, now);
  const iRated = assignment.cycle.ratings.some(
    (r) => r.reviewerId === sessionUserId,
  );
  const visibleAverage = getVisibleAverageForReviewer(
    assignment.cycle.ratings,
    sessionUserId,
  );

  const totalReviewers = assignment.cycle.assignments.length;
  const doneReviewers = assignment.cycle.ratings.length;

  let rowStatus: "action" | "rate" | "completed" | "waiting" | "unavailable";
  if (assignment.availability === "NOT_AVAILABLE") rowStatus = "unavailable";
  else if (assignment.availability === "PENDING") rowStatus = "action";
  else if (iRated) rowStatus = "completed";
  else if (ratingOpen) rowStatus = "rate";
  else rowStatus = "waiting";

  const statusConfig = {
    action: {
      label: "Set Availability",
      dot: "bg-amber-400",
      badge:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    },
    rate: {
      label: "Rating Open",
      dot: "bg-[#0e8a95]",
      badge: "bg-[#0e8a95]/10 text-[#0e8a95] border-[#0e8a95]/20",
    },
    completed: {
      label: "Completed",
      dot: "bg-green-500",
      badge:
        "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800",
    },
    waiting: {
      label: "Waiting",
      dot: "bg-slate-300",
      badge: "bg-muted text-muted-foreground border-border",
    },
    unavailable: {
      label: "Not Available",
      dot: "bg-slate-400",
      badge: "bg-muted text-muted-foreground border-border",
    },
  }[rowStatus];

  let actionHref = `/reviewer/${assignment.cycle.id}`;
  let actionLabel = "View Details";
  let actionStyle =
    "bg-muted text-muted-foreground hover:bg-muted/80 border border-border";

  if (rowStatus === "action") {
    actionHref = `/reviewer/${assignment.cycle.id}/availability`;
    actionLabel = "Set Availability";
    actionStyle = "bg-amber-500 text-white hover:bg-amber-600";
  } else if (rowStatus === "rate") {
    actionHref = `/reviewer/${assignment.cycle.id}/rate`;
    actionLabel = "Rate Now";
    actionStyle = "bg-[#0e8a95] text-white hover:bg-[#0ea5b0]";
  } else if (rowStatus === "completed") {
    actionHref = `/reviewer/${assignment.cycle.id}/rate`;
    actionLabel = "View Form";
    actionStyle = "bg-green-600 text-white hover:bg-green-700";
  }

  const employeeName = toTitleCase(assignment.cycle.user.name);
  const employeeMeta =
    [assignment.cycle.user.department, assignment.cycle.user.designation]
      .filter(Boolean)
      .join(" - ") || "-";

  return (
    <tr className="cursor-pointer hover:bg-muted/40 transition-colors">
      <RowLinkCell
        href={actionHref}
        className="text-xs text-muted-foreground font-mono"
      >
        {idx}
      </RowLinkCell>

      <RowLinkCell href={actionHref}>
        <span className="block text-sm font-semibold leading-tight text-foreground transition-colors hover:text-primary hover:underline">
          {employeeName}
        </span>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {employeeMeta}
        </div>
      </RowLinkCell>

      <RowLinkCell href={actionHref}>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0e8a95]/10 text-[#0e8a95] font-medium border border-[#0e8a95]/20">
          {assignment.cycle.type}
        </span>
      </RowLinkCell>

      <RowLinkCell href={actionHref}>
        <span className="text-xs font-mono font-semibold text-muted-foreground">
          {assignment.role}
        </span>
      </RowLinkCell>

      <RowLinkCell href={actionHref}>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusConfig.badge}`}
        >
          <span className={`size-1.5 rounded-full ${statusConfig.dot}`} />
          {statusConfig.label}
        </span>
      </RowLinkCell>

      <RowLinkCell href={actionHref}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: totalReviewers }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-sm ${i < doneReviewers ? "bg-green-500" : "bg-border"}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {doneReviewers}/{totalReviewers}
          </span>
        </div>
      </RowLinkCell>

      <RowLinkCell href={actionHref}>
        {visibleAverage !== null ? (
          <span className="text-xs font-bold text-green-600 dark:text-green-400">
            {visibleAverage.toFixed(1)}
          </span>
        ) : iRated ? (
          <span className="text-[11px] text-muted-foreground italic">
            Pending peers
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </RowLinkCell>

      <RowLinkCell href={actionHref}>
        {assignment.cycle.self ? (
          <div>
            <div className="text-[11px] text-foreground whitespace-nowrap">
              {assignment.cycle.self.editableUntil.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            {now > assignment.cycle.self.editableUntil && (
              <div className="text-[10px] text-red-500 font-medium mt-0.5">
                Passed
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </RowLinkCell>

      <RowLinkCell href={actionHref}>
        {assignment.cycle.scheduledDate ? (
          <span className="inline-flex flex-col text-[11px] leading-tight text-foreground transition-colors hover:text-primary hover:underline">
            <span>
              {assignment.cycle.scheduledDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="mt-0.5 text-[10px] text-green-600 dark:text-green-400">
              Scheduled
            </span>
          </span>
        ) : assignment.role === "HR" &&
          (assignment.cycle.tentativeDate1 ||
            assignment.cycle.tentativeDate2) ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#0e8a95]/10 px-2 py-1 text-[11px] font-semibold text-[#0e8a95] transition-colors hover:bg-[#0e8a95]/15">
            Confirm date
            <ChevronRight className="size-3" />
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </RowLinkCell>

      <td className="px-2 py-3">
        <Link
          href={actionHref}
          className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${actionStyle}`}
        >
          {actionLabel}
          <ChevronRight className="size-3" />
        </Link>
      </td>
    </tr>
  );
}
