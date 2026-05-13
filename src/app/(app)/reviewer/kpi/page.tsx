import Link from "next/link";
import { Fragment } from "react";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_KPI_MONTHLY_TARGET, KPI_MONTHLY_TARGET_SETTING, calculateAverageRating, calculateCriterionPoints, monthStart } from "@/lib/kpi";
import { calculateAssignedDayMonthlyRating } from "@/lib/kpi-rules";
import { toTitleCase } from "@/lib/utils";
import { calendarFromDb, countWorkingMinutes } from "@/lib/working-hours";
import { getSystemDate } from "@/lib/system-date";
import { FadeIn } from "@/components/motion-div";
import { Button } from "@/components/ui/button";
import { KpiTaskTimeline } from "@/components/kpi-task-timeline";
import {
  closeKpiTaskAction,
  createKpiTaskAction,
  pauseKpiTaskByTlAction,
  rejectPauseKpiTaskAction,
  reopenKpiTaskAction,
} from "./actions";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  PauseCircle,
  RotateCcw,
  Star,
  Timer,
  Upload,
} from "lucide-react";

type Search = { month?: string; tab?: string };

const TABS = [
  ["assign", "Assign Tasks"],
  ["active", "Active Tasks"],
  ["pending", "Pending Review"],
  ["paused", "Reopened / Paused"],
  ["ratings", "Monthly Ratings"],
] as const;

const TASK_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WAITING_REVIEW: "Waiting for TL Review",
  PAUSED: "Paused",
  PARTIALLY_COMPLETED: "Partially Completed",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

const TASK_TYPE_LABELS: Record<string, string> = {
  ONE_TIME: "One-time",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  RECURRING: "Recurring",
  DUE_DATE_BASED: "Due-date Based",
};

const RULE_TYPE_LABELS: Record<string, string> = {
  TURNAROUND_TIME: "Turnaround Time",
  DUE_DATE: "Due Date",
  RECURRING_WEEKLY_DUE_DATE: "Recurring Weekly",
  MANUAL: "Manual",
  HYBRID: "Hybrid",
};

function monthInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(date: Date | null) {
  if (!date) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function latestReason(events: Array<{ eventType: string; reason: string | null; timestamp: Date }>, eventType: string) {
  return events
    .filter((event) => event.eventType === eventType && event.reason)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.reason ?? null;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof ClipboardList;
  tone: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-sm ${tone}`}>
      <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

async function loadData(tlId: string, kpiDepartmentId: string | null, month: Date) {
  const [reviews, approvedCriteria, pendingCriteria, workingCalendar, monthlyTargetSetting] = await Promise.all([
    prisma.kpiReview.findMany({
      where: { month, user: { reportingManagerId: tlId } },
      orderBy: [{ user: { employeeNumber: "asc" } }, { user: { name: "asc" } }],
      include: {
        user: { select: { id: true, name: true, employeeNumber: true, kpiDepartmentId: true, reportingManagerId: true } },
        department: { select: { id: true, name: true } },
        kpiTasks: {
          orderBy: [{ assignedDate: "desc" }, { createdAt: "desc" }],
          include: {
            assignedTo: { select: { id: true, name: true, employeeNumber: true } },
            criterion: { select: { id: true, name: true, weightage: true, ruleType: true, ruleConfig: true } },
            events: {
              orderBy: { timestamp: "desc" },
              include: { actor: { select: { name: true } } },
            },
          },
        },
      },
    }),
    kpiDepartmentId
      ? prisma.kpiCriterion.findMany({
          where: {
            OR: [{ departmentId: kpiDepartmentId }, { divisionId: kpiDepartmentId }],
            approvalStatus: "APPROVED",
            status: "ACTIVE",
          },
          orderBy: { name: "asc" },
          include: {
            department: { select: { name: true } },
            division: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    kpiDepartmentId
      ? prisma.kpiCriterion.findMany({
          where: {
            OR: [{ departmentId: kpiDepartmentId }, { divisionId: kpiDepartmentId }],
            approvalStatus: "PENDING",
            status: "ACTIVE",
          },
          orderBy: { createdAt: "desc" },
          include: {
            department: { select: { name: true } },
            division: { select: { name: true } },
            createdBy: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    prisma.workingCalendar.findUnique({ where: { id: "default" } }),
    prisma.systemSetting.findFirst({ where: { key: KPI_MONTHLY_TARGET_SETTING } }),
  ]);

  return {
    reviews,
    approvedCriteria,
    pendingCriteria,
    workingCalendar,
    monthlyTarget: Number(monthlyTargetSetting?.value ?? DEFAULT_KPI_MONTHLY_TARGET),
  };
}

export default async function ReviewerKpiPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await auth();
  if (!session?.user) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, secondaryRole: true, name: true, kpiDepartmentId: true },
  });
  if (!me || (me.role !== "TL" && me.secondaryRole !== "TL")) {
    return (
      <div className="max-w-5xl rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Team KPI task operations are available only for TL users.
      </div>
    );
  }

  const sp = await searchParams;
  const selectedMonth = sp.month ?? monthInput();
  const month = monthStart(selectedMonth);
  const activeTab = TABS.some(([tab]) => tab === sp.tab) ? sp.tab! : "assign";
  const { reviews, approvedCriteria, pendingCriteria, workingCalendar, monthlyTarget } = await loadData(
    me.id,
    me.kpiDepartmentId,
    month,
  );
  const now = await getSystemDate();
  const calendar = calendarFromDb(workingCalendar);
  const tasks = reviews.flatMap((review) => review.kpiTasks.map((task) => ({ ...task, review })));
  const elapsedByTask = new Map<string, number>();
  for (const task of tasks) {
    let elapsed = task.timerElapsedMinutes;
    if (task.status === "IN_PROGRESS" || task.status === "REOPENED") {
      const lastStart = task.events.find((event) => event.eventType === "STARTED" || event.eventType === "RESUMED");
      if (lastStart) elapsed += countWorkingMinutes(lastStart.timestamp, now, calendar);
    }
    elapsedByTask.set(task.id, elapsed);
  }

  const activeTasks = tasks.filter((task) => task.status === "ASSIGNED" || task.status === "IN_PROGRESS");
  const pendingTasks = tasks.filter((task) => task.status === "WAITING_REVIEW");
  const pausedTasks = tasks.filter((task) => task.status === "REOPENED" || task.status === "PAUSED");
  const closedTasks = tasks.filter((task) => task.status === "CLOSED" && task.finalRating !== null);

  return (
    <div className="max-w-7xl space-y-5">
      <FadeIn>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="ds-h1">Team KPI</h1>
            <p className="ds-body mt-1">Assign tasks, review submissions, and finalize monthly KPI ratings for your team.</p>
          </div>
          <form className="flex items-end gap-2" action="/reviewer/kpi">
            <input type="hidden" name="tab" value={activeTab} />
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Month</span>
              <input name="month" type="month" defaultValue={selectedMonth} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
            </label>
            <Button type="submit" variant="outline">Load</Button>
          </form>
        </div>
      </FadeIn>

      <FadeIn delay={0.03}>
        <div className="flex flex-wrap gap-2">
          {TABS.map(([tab, label]) => (
            <Link
              key={tab}
              href={`/reviewer/kpi?tab=${tab}&month=${selectedMonth}`}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {tab === "pending" && pendingTasks.length > 0 ? ` (${pendingTasks.length})` : ""}
              {tab === "paused" && pausedTasks.length > 0 ? ` (${pausedTasks.length})` : ""}
            </Link>
          ))}
        </div>
      </FadeIn>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Team Employees" value={String(reviews.length)} icon={ClipboardList} tone="stat-teal" />
        <StatCard label="Active Tasks" value={String(activeTasks.length)} icon={Timer} tone="stat-cyan" />
        <StatCard label="Pending Review" value={String(pendingTasks.length)} icon={Upload} tone="stat-amber" />
        <StatCard label="Reopened / Paused" value={String(pausedTasks.length)} icon={RotateCcw} tone="stat-orange" />
        <StatCard label="Closed Tasks" value={String(closedTasks.length)} icon={CheckCircle2} tone="stat-green" />
      </div>

      {activeTab === "assign" && (
        <AssignTasksSection reviews={reviews} approvedCriteria={approvedCriteria} pendingCriteriaCount={pendingCriteria.length} selectedMonth={selectedMonth} />
      )}

      {activeTab === "active" && (
        <TaskTable title="Active Tasks" tasks={activeTasks} elapsedByTask={elapsedByTask} emptyText="No assigned or in-progress tasks for this month." />
      )}

      {activeTab === "pending" && (
        <PendingReviewSection tasks={pendingTasks} elapsedByTask={elapsedByTask} />
      )}

      {activeTab === "paused" && (
        <ReopenedPausedSection tasks={pausedTasks} elapsedByTask={elapsedByTask} />
      )}

      {activeTab === "ratings" && (
        <MonthlyRatingsSection reviews={reviews} monthlyTarget={monthlyTarget} />
      )}
    </div>
  );
}

type ReviewRow = Awaited<ReturnType<typeof loadData>>["reviews"][number];
type CriterionRow = Awaited<ReturnType<typeof loadData>>["approvedCriteria"][number];
type TaskRow = Awaited<ReturnType<typeof loadData>>["reviews"][number]["kpiTasks"][number] & { review: ReviewRow };

function AssignTasksSection({
  reviews,
  approvedCriteria,
  pendingCriteriaCount,
  selectedMonth,
}: {
  reviews: ReviewRow[];
  approvedCriteria: CriterionRow[];
  pendingCriteriaCount: number;
  selectedMonth: string;
}) {
  return (
    <FadeIn delay={0.06}>
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="size-4 text-primary" /> Assign Task
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Only employees reporting to you and approved criteria are available.</p>
          </div>

          {approvedCriteria.length === 0 || reviews.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
              {approvedCriteria.length === 0
                ? `No approved criteria yet${pendingCriteriaCount > 0 ? ` (${pendingCriteriaCount} waiting for your approval)` : ""}.`
                : "No KPI review drafts found for this month."}
            </div>
          ) : (
            <form action={createKpiTaskAction} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Employee</label>
                <select name="reviewId" required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                  {reviews.map((review) => (
                    <option key={review.id} value={review.id}>
                      {review.user.employeeNumber ? `${review.user.employeeNumber} - ` : ""}{toTitleCase(review.user.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Approved Criterion</label>
                <select name="criterionId" required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">Select criterion</option>
                  {approvedCriteria.map((criterion) => (
                    <option key={criterion.id} value={criterion.id}>
                      {criterion.name} ({criterion.weightage}%)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-xs font-semibold text-muted-foreground">Task Type</span>
                  <select name="taskType" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                    {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs font-semibold text-muted-foreground">Bulk Count</span>
                  <input name="bulkCount" type="number" min="1" max="25" defaultValue={1} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </label>
              </div>
              <input name="name" required placeholder="Task name *" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
              <textarea name="description" placeholder="Description" rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-xs font-semibold text-muted-foreground">Assigned Date</span>
                  <input name="assignedDate" type="date" defaultValue={`${selectedMonth}-01`} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs font-semibold text-muted-foreground">Due Date</span>
                  <input name="dueDate" type="date" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <input name="requiresFileUpload" type="checkbox" className="size-4 rounded border-border accent-primary" /> File proof required
              </label>
              <textarea name="tlRemarks" placeholder="TL remarks" rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <Button type="submit" className="w-full">Create Task</Button>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Team Task Load</h2>
          </div>
          <div className="divide-y divide-border">
            {reviews.map((review) => (
              <div key={review.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold">{review.user.employeeNumber ? `${review.user.employeeNumber} - ` : ""}{toTitleCase(review.user.name)}</p>
                  <p className="text-xs text-muted-foreground">{review.department.name}</p>
                </div>
                <div className="flex gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-1">{review.kpiTasks.length} task(s)</span>
                  <span className="rounded-full bg-muted px-2 py-1">{review.kpiTasks.filter((task) => task.status === "CLOSED").length} closed</span>
                </div>
              </div>
            ))}
            {reviews.length === 0 && <div className="px-5 py-10 text-center text-sm text-muted-foreground">No team KPI drafts for this month.</div>}
          </div>
        </section>
      </div>
    </FadeIn>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
      {TASK_STATUS_LABELS[status] ?? status.replaceAll("_", " ")}
    </span>
  );
}

function TaskTable({
  title,
  tasks,
  elapsedByTask,
  emptyText,
}: {
  title: string;
  tasks: TaskRow[];
  elapsedByTask: Map<string, number>;
  emptyText: string;
}) {
  return (
    <FadeIn delay={0.06}>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Timer className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {tasks.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-xs">
              <thead className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-3 font-medium">Employee</th>
                  <th className="px-3 font-medium">Criterion</th>
                  <th className="px-3 font-medium">Type</th>
                  <th className="px-3 font-medium">Assigned</th>
                  <th className="px-3 font-medium">Due</th>
                  <th className="px-3 font-medium">Timer</th>
                  <th className="px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => (
                  <Fragment key={task.id}>
                    <tr className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{task.name}</p>
                        {task.description && <p className="mt-1 text-[11px] text-muted-foreground">{task.description}</p>}
                      </td>
                      <td className="px-3 py-3">{toTitleCase(task.assignedTo.name)}</td>
                      <td className="px-3 py-3">{task.criterion.name}</td>
                      <td className="px-3 py-3">{TASK_TYPE_LABELS[task.taskType] ?? task.taskType}</td>
                      <td className="px-3 py-3">{formatDate(task.assignedDate)}</td>
                      <td className="px-3 py-3">{formatDate(task.dueDate)}</td>
                      <td className="px-3 py-3 font-semibold text-foreground">{formatMinutes(elapsedByTask.get(task.id) ?? task.timerElapsedMinutes)}</td>
                      <td className="px-3 py-3"><StatusBadge status={task.status} /></td>
                    </tr>
                    <tr className="bg-muted/10">
                      <td colSpan={8} className="px-4 py-3">
                        <KpiTaskTimeline events={task.events} compact />
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </FadeIn>
  );
}

function PendingReviewSection({ tasks, elapsedByTask }: { tasks: TaskRow[]; elapsedByTask: Map<string, number> }) {
  if (tasks.length === 0) {
    return (
      <FadeIn delay={0.06}>
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-green-500/50" />
          <p className="text-sm font-semibold text-muted-foreground">No pending reviews</p>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn delay={0.06}>
      <div className="space-y-4">
        {tasks.map((task) => {
          const submittedAt = task.events.find((event) => event.eventType === "SUBMITTED")?.timestamp ?? null;
          return (
            <section key={task.id} className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">{task.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toTitleCase(task.assignedTo.name)} - {task.criterion.name} - Submitted {formatDateTime(submittedAt)}
                  </p>
                </div>
                <StatusBadge status={task.status} />
              </div>
              <div className="grid gap-4 p-5 xl:grid-cols-[1fr_420px]">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoTile label="Timer Breakdown" value={formatMinutes(elapsedByTask.get(task.id) ?? task.timerElapsedMinutes)} icon={Timer} />
                  <InfoTile label="Rule" value={RULE_TYPE_LABELS[task.criterion.ruleType] ?? task.criterion.ruleType} icon={CalendarClock} />
                  <InfoTile label="Uploaded File" value={task.fileUrl ? "Available" : "Not uploaded"} icon={FileText} href={task.fileUrl} />
                  <InfoTile label="Employee Remarks" value={task.employeeRemarks ?? "-"} icon={AlertCircle} />
                </div>
                <KpiTaskTimeline events={task.events} />
                <div className="space-y-3">
                  <form action={closeKpiTaskAction} className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input name="manualRating" type="number" min="1" max="5" step="0.01" placeholder="Manual rating for manual/hybrid rules" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                    <input name="tlRemarks" placeholder="Closure remarks" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                    <Button type="submit" size="sm">Close / Approve</Button>
                  </form>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <TaskDecisionForm action={reopenKpiTaskAction} taskId={task.id} button="Reopen" placeholder="Reopen reason" icon={RotateCcw} />
                    <TaskDecisionForm action={pauseKpiTaskByTlAction} taskId={task.id} button="Pause" placeholder="Pause reason" icon={PauseCircle} />
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </FadeIn>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  icon: typeof Timer;
  href?: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <Icon className="size-3.5 text-primary" /> {label}
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="break-all text-xs font-semibold text-primary hover:underline">
          View file
        </a>
      ) : (
        <p className="line-clamp-3 text-xs text-foreground">{value}</p>
      )}
    </div>
  );
}

function TaskDecisionForm({
  action,
  taskId,
  button,
  placeholder,
  icon: Icon,
}: {
  action: (formData: FormData) => void | Promise<void>;
  taskId: string;
  button: string;
  placeholder: string;
  icon: typeof RotateCcw;
}) {
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <input name="reason" required placeholder={placeholder} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-xs" />
      <Button type="submit" size="sm" variant="outline">
        <Icon className="size-3.5" /> {button}
      </Button>
    </form>
  );
}

function ReopenedPausedSection({ tasks, elapsedByTask }: { tasks: TaskRow[]; elapsedByTask: Map<string, number> }) {
  return (
    <FadeIn delay={0.06}>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <PauseCircle className="size-4 text-primary" /> Reopened / Paused Tasks
          </h2>
        </div>
        {tasks.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">No reopened or paused tasks for this month.</div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <div key={task.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_360px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{task.name}</p>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toTitleCase(task.assignedTo.name)} - {task.criterion.name} - Timer {formatMinutes(elapsedByTask.get(task.id) ?? task.timerElapsedMinutes)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {latestReason(task.events, "REOPENED") ?? latestReason(task.events, "PAUSE_REQUESTED") ?? latestReason(task.events, "PAUSED_BY_TL") ?? task.tlRemarks ?? "No reason recorded."}
                  </p>
                </div>
                <div className="space-y-2">
                  <TaskDecisionForm action={reopenKpiTaskAction} taskId={task.id} button="Reopen" placeholder="Reason / instructions" icon={RotateCcw} />
                  {task.status === "PAUSED" && (
                    <TaskDecisionForm action={pauseKpiTaskByTlAction} taskId={task.id} button="Approve Pause" placeholder="Approval note" icon={PauseCircle} />
                  )}
                  {task.status === "PAUSED" && (
                    <TaskDecisionForm action={rejectPauseKpiTaskAction} taskId={task.id} button="Reject Pause" placeholder="Rejection reason" icon={AlertCircle} />
                  )}
                </div>
                <div className="xl:col-span-2">
                  <KpiTaskTimeline events={task.events} compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </FadeIn>
  );
}

function assignedDayCount(tasks: Array<{ assignedDate: Date; finalRating: number | null }>) {
  const keys = new Set<string>();
  for (const task of tasks) {
    if (task.finalRating === null || !Number.isFinite(task.finalRating)) continue;
    keys.add(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(task.assignedDate));
  }
  return keys.size;
}

function MonthlyRatingsSection({ reviews, monthlyTarget }: { reviews: ReviewRow[]; monthlyTarget: number }) {
  return (
    <FadeIn delay={0.06}>
      <div className="space-y-4">
        {reviews.map((review) => {
          const closed = review.kpiTasks.filter((task) => task.status === "CLOSED" && task.finalRating !== null);
          const byCriterion = new Map<string, { name: string; weightage: number; tasks: Array<{ assignedDate: Date; finalRating: number | null }>; count: number }>();
          for (const task of closed) {
            const current = byCriterion.get(task.criterionId) ?? {
              name: task.criterion.name,
              weightage: task.criterion.weightage,
              tasks: [],
              count: 0,
            };
            current.tasks.push({ assignedDate: task.assignedDate, finalRating: task.finalRating });
            current.count += 1;
            byCriterion.set(task.criterionId, current);
          }
          const breakdown = [...byCriterion.values()].map((row) => {
            const rating = calculateAssignedDayMonthlyRating(row.tasks) ?? 0;
            return {
              ...row,
              assignedDays: assignedDayCount(row.tasks),
              rating,
              points: calculateCriterionPoints(row.weightage, rating, monthlyTarget),
            };
          });
          const finalPoints = Math.round(breakdown.reduce((sum, row) => sum + row.points, 0));
          const dailyAverage = calculateAverageRating(breakdown.map((row) => row.rating));

          return (
            <section key={review.id} className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    {review.user.employeeNumber ? `${review.user.employeeNumber} - ` : ""}{toTitleCase(review.user.name)}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">{review.department.name} - {review.month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{finalPoints.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">Final points</p>
                </div>
              </div>
              <div className="grid gap-4 p-5 xl:grid-cols-[1fr_280px]">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[700px] text-xs">
                    <thead className="bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Criterion</th>
                        <th className="px-3 font-medium">Weight</th>
                        <th className="px-3 font-medium">Task Count</th>
                        <th className="px-3 font-medium">Assigned Days</th>
                        <th className="px-3 font-medium">Criteria Rating</th>
                        <th className="px-3 font-medium">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {breakdown.map((row) => (
                        <tr key={row.name}>
                          <td className="px-4 py-3 font-semibold">{row.name}</td>
                          <td className="px-3">{row.weightage}%</td>
                          <td className="px-3">{row.count}</td>
                          <td className="px-3">{row.assignedDays}</td>
                          <td className="px-3">{row.rating.toFixed(2)}</td>
                          <td className="px-3 font-semibold text-primary">{Math.round(row.points).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                      {breakdown.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No closed tasks yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Star className="size-4 text-primary" /> Calculation
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>Daily average: <span className="font-semibold text-foreground">{dailyAverage.toFixed(2)}</span></p>
                    <p>Task count: <span className="font-semibold text-foreground">{closed.length}</span></p>
                    <p>Monthly target: <span className="font-semibold text-foreground">{monthlyTarget.toLocaleString("en-IN")} pts</span></p>
                    <p>Each criterion averages tasks inside the assigned day, then averages assigned days only before applying weightage.</p>
                    <p>Final points are the sum of all criteria points for this employee and month.</p>
                  </div>
                </div>
                <div className="xl:col-span-2">
                  <div className="grid gap-3 md:grid-cols-2">
                    {closed.map((task) => (
                      <div key={task.id} className="rounded-lg border border-border bg-card p-3">
                        <p className="text-xs font-semibold text-foreground">{task.name}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Final rating {task.finalRating?.toFixed(2) ?? "-"} - {task.ratingExplanation ?? "Rating explanation pending."}
                        </p>
                        <div className="mt-3">
                          <KpiTaskTimeline events={task.events} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
        {reviews.length === 0 && (
          <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            No team KPI reviews found for this month.
          </div>
        )}
      </div>
    </FadeIn>
  );
}
