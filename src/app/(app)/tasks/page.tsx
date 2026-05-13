import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Fragment } from "react";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { KpiTaskTimeline } from "@/components/kpi-task-timeline";
import { monthStart } from "@/lib/kpi";
import { calendarFromDb, countWorkingMinutes } from "@/lib/working-hours";
import { getSystemDate } from "@/lib/system-date";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import {
  requestPauseKpiTaskAction,
  startKpiTaskAction,
  submitKpiTaskAction,
} from "@/app/(app)/employee/kpi-actions";
import {
  Timer, Clock, PauseCircle, AlertCircle, Upload
} from "lucide-react";

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
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatDateTime(date: Date | null) {
  if (!date) return "-";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const userId = session.user.id;
  const role = session.user.role;

  const currentMonth = monthStart(new Date());
  const [currentKpiRaw, workingCalendar] = await Promise.all([
    prisma.kpiReview.findFirst({
      where: { organizationId, userId, month: currentMonth },
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

  const now = await getSystemDate();
  const calendarConfig = calendarFromDb(workingCalendar);
  const kpiTasks = currentKpiRaw?.kpiTasks ?? [];

  const taskElapsed = new Map<string, number>();
  for (const task of kpiTasks) {
    let elapsed = task.timerElapsedMinutes;
    if (task.status === "IN_PROGRESS" || task.status === "REOPENED") {
      const lastStart = task.events.find((e) => e.eventType === "STARTED" || e.eventType === "RESUMED");
      if (lastStart) elapsed += countWorkingMinutes(lastStart.timestamp, now, calendarConfig);
    }
    taskElapsed.set(task.id, elapsed);
  }

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Breadcrumbs items={[{ label: "Tasks" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentKpiRaw
                ? `${currentKpiRaw.department.name} · ${currentKpiRaw.month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`
                : "Current month KPI tasks"}
            </p>
          </div>
          {["ADMIN", "MANAGEMENT"].includes(role) && (
            <Link href="/admin/kpi">
              <Button variant="outline" size="sm">View Department KPI</Button>
            </Link>
          )}
        </div>

        {kpiTasks.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No KPI tasks assigned for the current month.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Timer className="size-4 text-primary" /> Active Tasks
              </span>
              <span className="text-[11px] text-muted-foreground">
                Ratings are calculated by the system and finalised by TL
              </span>
            </div>
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
                    const reopenReason = task.events.filter((e) => e.eventType === "REOPENED" && e.reason).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.reason ?? null;
                    const closed = task.status === "CLOSED";
                    const timerStatus =
                      task.status === "IN_PROGRESS" || task.status === "REOPENED" ? "Running"
                      : task.status === "WAITING_REVIEW" ? "Frozen in TL Review"
                      : task.status === "PAUSED" ? "Pause Requested"
                      : task.status === "CLOSED" ? "Stopped"
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
                            <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">{statusLabel}</span>
                          </td>
                          <td className="px-3 py-4">
                            {closed ? (
                              <div className="max-w-[260px] space-y-1.5">
                                <p className="text-xs font-semibold text-primary">Final Rating: {task.finalRating?.toFixed(2) ?? "-"}</p>
                                <p className="text-[11px] text-muted-foreground">{task.ratingExplanation ?? "Rating explanation will appear after TL closes the task."}</p>
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
                                    <input name="fileUrl" defaultValue={task.fileUrl ?? ""} required={task.requiresFileUpload} placeholder={task.requiresFileUpload ? "Proof file link required" : "Proof file link"} className="h-8 w-44 rounded-md border border-border bg-background px-2 text-xs" />
                                    <input name="remarks" defaultValue={task.employeeRemarks ?? ""} placeholder="Remarks" className="h-8 w-36 rounded-md border border-border bg-background px-2 text-xs" />
                                    <Button type="submit" size="sm"><Upload className="size-3.5" /> Completed</Button>
                                  </div>
                                </form>
                                <form action={submitKpiTaskAction} className="flex gap-2">
                                  <input type="hidden" name="taskId" value={task.id} />
                                  <input type="hidden" name="isPartial" value="true" />
                                  <input name="fileUrl" defaultValue={task.fileUrl ?? ""} required={task.requiresFileUpload} placeholder={task.requiresFileUpload ? "Proof file link required" : "Proof file link"} className="h-8 w-44 rounded-md border border-border bg-background px-2 text-xs" />
                                  <input name="remarks" required placeholder="Partial reason required" className="h-8 w-40 rounded-md border border-border bg-background px-2 text-xs" />
                                  <Button type="submit" size="sm" variant="outline">Partially Completed</Button>
                                </form>
                                <form action={requestPauseKpiTaskAction} className="flex gap-2">
                                  <input type="hidden" name="taskId" value={task.id} />
                                  <input name="reason" required placeholder="Pause reason required" className="h-8 w-56 rounded-md border border-border bg-background px-2 text-xs" />
                                  <Button type="submit" size="sm" variant="outline"><AlertCircle className="size-3.5" /> Pause Request</Button>
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
          </div>
        )}
      </div>
    </FadeIn>
  );
}
