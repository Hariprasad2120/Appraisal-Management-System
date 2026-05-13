import Link from "next/link";
import { Fragment } from "react";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Button } from "@/components/ui/button";
import { KpiTaskTimeline } from "@/components/kpi-task-timeline";
import {
  assignEmployeeKpiDepartmentAction,
  adminOverrideKpiTaskRatingAction,
  createKpiDepartmentAction,
  createKpiReviewDraftAction,
  createKpiTemplateItemAction,
  finalizeKpiReviewAction,
  loadPreviousMonthKpiSetupAction,
  removeKpiDepartmentAction,
  reopenKpiReviewAction,
  saveKpiReviewScoresAction,
  toggleKpiDepartmentAction,
  updateKpiTemplateItemAction,
} from "../kpi/actions";
import {
  DEFAULT_KPI_MONTHLY_TARGET,
  KPI_MONTHLY_TARGET_SETTING,
  KPI_RATING_SCALE_SETTING,
  monthStart,
  parseKpiRatingScale,
} from "@/lib/kpi";
import { toTitleCase } from "@/lib/utils";
import { Building2, ChevronRight, ListChecks, Trophy, Users } from "lucide-react";
import { TemplateDepartmentPicker } from "../kpi/template-department-picker";
import { CriteriaFormToggle, CriteriaEditInline } from "../kpi/criteria-form";
import { toggleKpiCriterionStatusAction } from "../kpi/criteria-actions";
import { saveWorkingCalendarAction } from "../kpi/calendar-actions";

type Search = {
  tab?: string;
  departmentId?: string;
  userId?: string;
  month?: string;
  year?: string;
};

type Department = Awaited<ReturnType<typeof loadData>>["departments"][number];

function monthInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function departmentLabel(department: Department, departments: Department[]) {
  if (!department.parentId) return department.name;
  const parent = departments.find((candidate) => candidate.id === department.parentId);
  return parent ? `${parent.name} / ${department.name}` : department.name;
}

function departmentAssignedCount(department: Department, departments: Department[]) {
  return departments
    .filter((candidate) => candidate.id === department.id || candidate.parentId === department.id)
    .reduce((sum, candidate) => sum + candidate._count.users, 0);
}

function selectableKpiDepartments(departments: Department[]) {
  const parentIds = new Set(departments.filter((department) => department.parentId).map((department) => department.parentId));
  return departments.filter((department) => !parentIds.has(department.id));
}

async function loadData() {
  const [
    departments,
    users,
    templates,
    reviews,
    settings,
    criteria,
    workingCalendar,
  ] = await Promise.all([
    prisma.kpiDepartment.findMany({
      where: { active: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { users: true, reviews: true, children: true } } },
    }),
    prisma.user.findMany({
      where: { active: true, role: { notIn: ["MANAGEMENT", "PARTNER"] } },
      orderBy: [{ employeeNumber: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        employeeNumber: true,
        department: true,
        kpiDepartmentId: true,
        kpiDepartment: { select: { id: true, name: true, parentId: true } },
        reportingManagerId: true,
        reportingManager: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.kpiTemplate.findMany({
      orderBy: [{ department: { name: "asc" } }, { version: "desc" }],
      include: {
        department: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.kpiReview.findMany({
      orderBy: [{ month: "desc" }, { monthlyPointScore: "desc" }],
      take: 300,
      include: {
        user: { select: { id: true, name: true, employeeNumber: true } },
        department: true,
        items: { orderBy: { sortOrder: "asc" } },
        kpiTasks: {
          orderBy: [{ assignedDate: "desc" }, { createdAt: "desc" }],
          include: {
            assignedTo: { select: { name: true, employeeNumber: true } },
            assignedBy: { select: { name: true } },
            criterion: { select: { name: true, weightage: true, ruleType: true } },
            events: {
              orderBy: { timestamp: "desc" },
              include: { actor: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.systemSetting.findMany({
      where: { key: { in: [KPI_MONTHLY_TARGET_SETTING, KPI_RATING_SCALE_SETTING] } },
    }),
    prisma.kpiCriterion.findMany({
      orderBy: [{ departmentId: "asc" }, { createdAt: "desc" }],
      include: {
        department: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.workingCalendar.findUnique({ where: { id: "default" } }),
  ]);
  return { departments, users, templates, reviews, settings, criteria, workingCalendar };
}

function TabLink({ tab, activeTab, children }: { tab: string; activeTab: string; children: React.ReactNode }) {
  const active = tab === activeTab;
  return (
    <Link
      href={`/admin/kpi?tab=${tab}`}
      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function AdminKpiPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const activeTab = ["departments", "templates", "criteria", "scores", "reports", "settings"].includes(sp.tab ?? "")
    ? sp.tab!
    : "departments";
  const { departments, users, templates, reviews, settings, criteria, workingCalendar } = await loadData();
  const selectableDepartments = selectableKpiDepartments(departments);
  const rootDepartments = departments.filter((department) => !department.parentId);
  const childrenByParent = new Map<string, Department[]>();
  for (const department of departments) {
    if (!department.parentId) continue;
    childrenByParent.set(department.parentId, [...(childrenByParent.get(department.parentId) ?? []), department]);
  }
  const defaultTemplateDepartmentId = templates.find((template) => template.active)?.departmentId
    ?? templates[0]?.departmentId
    ?? selectableDepartments[0]?.id
    ?? "";
  const selectedDepartmentId = sp.departmentId
    ?? (activeTab === "templates" ? defaultTemplateDepartmentId : selectableDepartments[0]?.id ?? "");
  const selectedTemplate = templates.find((template) => template.departmentId === selectedDepartmentId && template.active)
    ?? templates.find((template) => template.departmentId === selectedDepartmentId);
  const selectedUserId = sp.userId ?? users.find((user) => user.kpiDepartmentId)?.id ?? "";
  const selectedMonth = sp.month ?? monthInput();
  const selectedMonthDate = monthStart(selectedMonth);
  const selectedReview = reviews.find(
    (review) => review.userId === selectedUserId && review.month.getTime() === selectedMonthDate.getTime(),
  );
  const settingsMap = new Map(settings.map((setting) => [setting.key, setting.value]));
  const monthlyTarget = Number(settingsMap.get(KPI_MONTHLY_TARGET_SETTING) ?? DEFAULT_KPI_MONTHLY_TARGET);
  const ratingScale = parseKpiRatingScale(settingsMap.get(KPI_RATING_SCALE_SETTING));
  const groupedTemplateItems = (selectedTemplate?.items.filter((item) => item.itemKind === "CRITERION") ?? []).map((criterion) => ({
    criterion,
    tasks: selectedTemplate?.items.filter((item) => item.parentItemId === criterion.id && item.itemKind === "TASK") ?? [],
  }));
  const ungroupedTemplateTasks = selectedTemplate?.items.filter((item) => item.itemKind === "TASK" && !item.parentItemId) ?? [];
  const selectedReviewCriteria = selectedReview?.items.filter((item) => item.itemKind === "CRITERION") ?? [];
const selectedReviewTaskGroups = selectedReviewCriteria.map((criterion) => ({
    criterion,
    tasks: selectedReview?.items.filter((item) => item.parentItemId === criterion.id && item.itemKind === "TASK") ?? [],
  }));

const REVIEW_ITEM_STATUS_LABELS: Record<string, string> = {
  NOT_COMPLETED: "Not completed",
  PARTIALLY_COMPLETED: "Partially completed",
  FULLY_COMPLETED: "Fully completed",
};

const REVIEW_APPROVAL_LABELS: Record<string, string> = {
  PENDING: "Pending approval",
  APPROVED: "Approved",
  DISAPPROVED: "Disapproved",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  WAITING_REVIEW: "Waiting for TL review",
  PAUSED: "Paused",
  PARTIALLY_COMPLETED: "Partially completed",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

function reviewItemStatusLabel(status: string) {
  return REVIEW_ITEM_STATUS_LABELS[status] ?? status.replaceAll("_", " ").toLowerCase();
}

function reviewApprovalLabel(status: string, assigned: boolean) {
  const approval = REVIEW_APPROVAL_LABELS[status] ?? status.replaceAll("_", " ").toLowerCase();
  return `${approval} / ${assigned ? "Assigned" : "Not assigned"}`;
}

function taskStatusLabel(status: string) {
  return TASK_STATUS_LABELS[status] ?? status.replaceAll("_", " ").toLowerCase();
}
  const reportYear = Number(sp.year ?? new Date().getFullYear());
  const reportRows = reviews.filter(
    (review) => review.status === "FINALIZED" && review.month.getFullYear() === reportYear,
  );
  const annualByUser = new Map<string, { name: string; score: number; months: number }>();
  for (const review of reportRows) {
    const current = annualByUser.get(review.userId) ?? { name: review.user.name, score: 0, months: 0 };
    current.score += review.monthlyPointScore;
    current.months += 1;
    annualByUser.set(review.userId, current);
  }
  const annualRows = [...annualByUser.values()].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-7xl space-y-5">
      <FadeIn>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="ds-h1">Department KPI</h1>
            <p className="ds-body mt-1">
              Monthly department-wise KPI templates, scoring, and reports.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-right">
            <p className="text-[10px] text-muted-foreground">Monthly target</p>
            <p className="text-lg font-bold text-primary">{monthlyTarget.toLocaleString("en-IN")} pts</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.04}>
        <div className="flex flex-wrap gap-2">
          <TabLink tab="departments" activeTab={activeTab}>Departments</TabLink>
          <TabLink tab="templates" activeTab={activeTab}>Templates</TabLink>
          <TabLink tab="criteria" activeTab={activeTab}>KPI Criteria</TabLink>
          <TabLink tab="scores" activeTab={activeTab}>Monthly Scores</TabLink>
          <TabLink tab="reports" activeTab={activeTab}>Reports</TabLink>
          <TabLink tab="settings" activeTab={activeTab}>Working Hours</TabLink>
        </div>
      </FadeIn>

      {activeTab === "departments" && (
        <FadeIn delay={0.08}>
          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <section className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="size-4 text-primary" /> KPI Departments
                </h2>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1fr_150px_130px_190px] border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground">
                    <span>Department</span>
                    <span>Employees</span>
                    <span>Divisions</span>
                    <span className="text-right">Actions</span>
                  </div>
                  <div className="divide-y divide-border">
                {rootDepartments.map((department) => {
                  const divisions = childrenByParent.get(department.id) ?? [];
                  const assignedCount = departmentAssignedCount(department, departments);
                  return (
                    <details key={department.id} className="group" open={divisions.length === 0 ? undefined : false}>
                      <summary className="grid cursor-pointer list-none grid-cols-[1fr_150px_130px_190px] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            {divisions.length > 0 && (
                              <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                            )}
                            <span>{department.name}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {divisions.length > 0 ? "Root department" : "No divisions"}
                          </p>
                        </div>
                        <span className="text-sm text-foreground">
                          {assignedCount} employee{assignedCount === 1 ? "" : "s"}
                        </span>
                        <span className="text-sm text-foreground">
                          {divisions.length || "-"}
                        </span>
                        <div className="flex items-center justify-end gap-2">
                          <form action={toggleKpiDepartmentAction}>
                            <input type="hidden" name="id" value={department.id} />
                            <input type="hidden" name="active" value={String(department.active)} />
                            <Button type="submit" variant="outline" size="sm">
                              {department.active ? "Deactivate" : "Activate"}
                            </Button>
                          </form>
                          <form action={removeKpiDepartmentAction}>
                            <input type="hidden" name="id" value={department.id} />
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              title={
                                department._count.reviews > 0
                                  ? "Has KPI history, so remove will hide it and unassign employees"
                                  : "Remove department"
                              }
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </form>
                        </div>
                      </summary>

                      {divisions.length > 0 && (
                        <div className="border-t border-border bg-muted/20">
                          {divisions.map((division) => (
                            <div key={division.id} className="grid grid-cols-[1fr_150px_130px_190px] items-center gap-3 px-5 py-3">
                              <div className="pl-6">
                                <p className="text-sm font-semibold text-foreground">{division.name}</p>
                                <p className="text-[11px] text-muted-foreground">Division of {department.name}</p>
                              </div>
                              <span className="text-sm text-foreground">
                                {division._count.users} employee{division._count.users === 1 ? "" : "s"}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground">Division</span>
                              <div className="flex items-center justify-end gap-2">
                                <form action={toggleKpiDepartmentAction}>
                                  <input type="hidden" name="id" value={division.id} />
                                  <input type="hidden" name="active" value={String(division.active)} />
                                  <Button type="submit" variant="outline" size="sm">
                                    {division.active ? "Deactivate" : "Activate"}
                                  </Button>
                                </form>
                                <form action={removeKpiDepartmentAction}>
                                  <input type="hidden" name="id" value={division.id} />
                                  <Button
                                    type="submit"
                                    variant="outline"
                                    size="sm"
                                    title={
                                      division._count.reviews > 0
                                        ? "Has KPI history, so remove will hide it and unassign employees"
                                        : "Remove division"
                                    }
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </Button>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </details>
                  );
                })}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <form action={createKpiDepartmentAction} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold">Add Department</h2>
                <input name="name" required placeholder="Department or sub-department name" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                <select name="parentId" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">Root department</option>
                  {departments.filter((department) => !department.parentId && department.active).map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Choose a root department here when adding a sub-department. Matching employees are assigned automatically.
                </p>
                <Button type="submit" className="w-full">Add</Button>
              </form>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-primary" /> Employee KPI Assignment
                </h2>
                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {users.map((user) => (
                    <form key={user.id} action={assignEmployeeKpiDepartmentAction} className="grid grid-cols-[1fr_170px_auto] items-center gap-2 rounded-lg border border-border p-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{toTitleCase(user.name)}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{user.department ?? "No department"}</p>
                      </div>
                      <select name="kpiDepartmentId" defaultValue={user.kpiDepartmentId ?? ""} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                        <option value="">Unassigned</option>
                        {selectableDepartments.map((department) => (
                          <option key={department.id} value={department.id}>{departmentLabel(department, departments)}</option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">Save</Button>
                    </form>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">TL &amp; Manager Ownership</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Assign employees to TLs and TLs to Managers in the dedicated Ownership page.
                </p>
                <Link href="/hrms/ownership" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                  Go to Ownership <ChevronRight className="size-3" />
                </Link>
              </div>
            </section>
          </div>
        </FadeIn>
      )}

      {activeTab === "templates" && (
        <FadeIn delay={0.08}>
          <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-3">
              <TemplateDepartmentPicker
                departments={selectableDepartments.map((department) => ({
                  id: department.id,
                  label: departmentLabel(department, departments),
                }))}
                selectedDepartmentId={selectedDepartmentId}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
              <section className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <ListChecks className="size-4 text-primary" />
                    {selectedTemplate?.name ?? "No template"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Active task total: {(selectedTemplate?.items.filter((item) => item.active && item.itemKind === "TASK").reduce((sum, item) => sum + item.weightage, 0) ?? 0).toFixed(2)}%
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {[...groupedTemplateItems, ...(ungroupedTemplateTasks.length ? [{ criterion: null, tasks: ungroupedTemplateTasks }] : [])].map((group, groupIndex) => (
                    <div key={group.criterion?.id ?? "general"} className="space-y-3 px-5 py-4">
                      {group.criterion ? (
                        <form action={updateKpiTemplateItemAction} className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_110px]">
                          <input type="hidden" name="id" value={group.criterion.id} />
                          <input type="hidden" name="weightage" value="0" />
                          <input name="name" defaultValue={group.criterion.name} className="h-9 rounded-md border border-border bg-background px-3 text-sm font-semibold" />
                          <input name="measurement" defaultValue={group.criterion.measurement} placeholder="Criterion notes" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                          <input name="target" defaultValue={group.criterion.target} placeholder="Criterion target" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                          <div className="flex gap-2">
                            <select name="active" defaultValue={String(group.criterion.active)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs">
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                            <Button type="submit" size="sm">Save</Button>
                          </div>
                        </form>
                      ) : (
                        <h3 className="text-sm font-semibold">General KPI</h3>
                      )}
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full min-w-[900px] text-xs">
                          <thead className="bg-muted/40 text-left text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-medium">Task</th>
                              <th className="px-3 font-medium">Weight</th>
                              <th className="px-3 font-medium">Measurement</th>
                              <th className="px-3 font-medium">Target</th>
                              <th className="px-3 font-medium">Description</th>
                              <th className="px-3 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {group.tasks.map((item) => (
                              <tr key={item.id}>
                                <td colSpan={6} className="p-0">
                                  <form action={updateKpiTemplateItemAction} className="grid grid-cols-[1.4fr_90px_1fr_1fr_1fr_130px] gap-2 p-3">
                                    <input type="hidden" name="id" value={item.id} />
                                    <input name="name" defaultValue={item.name} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                                    <input name="weightage" type="number" step="0.01" min="0" defaultValue={item.weightage} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                                    <input name="measurement" defaultValue={item.measurement} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                                    <input name="target" defaultValue={item.target} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                                    <input name="description" defaultValue={item.description ?? ""} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                                    <div className="flex gap-2">
                                      <select name="active" defaultValue={String(item.active)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs">
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                      </select>
                                      <Button type="submit" size="sm">Save</Button>
                                    </div>
                                  </form>
                                </td>
                              </tr>
                            ))}
                            {group.tasks.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No tasks under this criterion.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <form action={createKpiTemplateItemAction} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold">Add KPI Criterion</h2>
                <input type="hidden" name="departmentId" value={selectedDepartmentId} />
                <input name="name" required placeholder="Criterion name" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                <textarea name="description" placeholder="Criterion description" className="min-h-[64px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Tasks</p>
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="space-y-2 rounded-lg border border-border p-3">
                      <input name={`taskName:${index}`} required={index === 0} placeholder={`Task ${index + 1} name`} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                      <input name={`taskWeightage:${index}`} required={index === 0} type="number" step="0.01" min="0" placeholder="Weightage %" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                      <input name={`taskMeasurement:${index}`} placeholder="Measurement" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                      <input name={`taskTarget:${index}`} placeholder="Target" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                      <textarea name={`taskDescription:${index}`} placeholder="Task description" className="min-h-[58px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
                <Button type="submit" className="w-full">Add Criterion & Tasks</Button>
              </form>
            </div>
          </div>
        </FadeIn>
      )}

      {activeTab === "criteria" && (
        <FadeIn delay={0.08}>
          <CriteriaTab
            criteria={criteria}
            departments={departments}
          />
        </FadeIn>
      )}

      {activeTab === "settings" && (
        <FadeIn delay={0.08}>
          <WorkingCalendarForm calendar={workingCalendar} />
        </FadeIn>
      )}

      {activeTab === "scores" && (
        <FadeIn delay={0.08}>
          <div className="space-y-5">
            <form className="flex flex-wrap items-end gap-3" action="/appraisal/kpi">
              <input type="hidden" name="tab" value="scores" />
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Employee</span>
                <select name="userId" defaultValue={selectedUserId} className="h-9 min-w-[280px] rounded-md border border-border bg-background px-3 text-sm">
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.employeeNumber ? `${user.employeeNumber} - ` : ""}{toTitleCase(user.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Month</span>
                <input name="month" type="month" defaultValue={selectedMonth} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
              </label>
              <Button type="submit" variant="outline">Load</Button>
            </form>

            {!selectedReview ? (
              <div className="grid gap-5 lg:grid-cols-2">
                <form action={createKpiReviewDraftAction} className="rounded-xl border border-border bg-card p-6 text-center">
                  <input type="hidden" name="userId" value={selectedUserId} />
                  <input type="hidden" name="month" value={selectedMonth} />
                  <p className="text-sm text-muted-foreground">No KPI draft exists for this employee and month.</p>
                  <Button type="submit" className="mt-4">Start Draft From Active Template</Button>
                </form>
                <form action={loadPreviousMonthKpiSetupAction} className="space-y-3 rounded-xl border border-border bg-card p-6">
                  <input type="hidden" name="targetUserId" value={selectedUserId} />
                  <input type="hidden" name="targetMonth" value={selectedMonth} />
                  <h2 className="text-sm font-semibold">Load Previous Month Setup</h2>
                  <select name="sourceReviewId" required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                    <option value="">Select previous KPI month</option>
                    {reviews.filter((review) => review.userId === selectedUserId && review.month.getTime() !== selectedMonthDate.getTime()).map((review) => (
                      <option key={review.id} value={review.id}>
                        {review.month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} - {review.status}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline" className="w-full">Copy Into Selected Month</Button>
                </form>
              </div>
            ) : (
              <form action={saveKpiReviewScoresAction} className="rounded-xl border border-border bg-card">
                <input type="hidden" name="reviewId" value={selectedReview.id} />
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold">
                      {toTitleCase(selectedReview.user.name)} - {selectedReview.month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    </h2>
                    <p className="text-xs text-muted-foreground">{selectedReview.department.name} - {selectedReview.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{selectedReview.monthlyPointScore.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">{selectedReview.performanceCategory}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-sm">
                    <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Criterion / Task</th>
                        <th className="px-4 font-medium">Weight</th>
                        <th className="px-4 font-medium">Target</th>
                        <th className="px-4 font-medium">Status</th>
                        <th className="px-4 font-medium">Approval</th>
                        <th className="px-4 font-medium">Rating</th>
                        <th className="px-4 font-medium">Achievement %</th>
                        <th className="px-4 font-medium">Actual</th>
                        <th className="px-4 font-medium">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedReviewTaskGroups.map((group) => (
                        <Fragment key={group.criterion.id}>
                          <tr key={group.criterion.id} className="bg-muted/25">
                            <td className="px-4 py-3 font-semibold text-foreground" colSpan={9}>{group.criterion.name}</td>
                          </tr>
                          {group.tasks.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-foreground">{item.name}</p>
                                <p className="text-[11px] text-muted-foreground">{item.description || item.measurement}</p>
                              </td>
                              <td className="px-4 font-semibold">{item.weightage}%</td>
                              <td className="px-4 text-xs text-muted-foreground">{item.target || "-"}</td>
                              <td className="px-4 text-xs">{reviewItemStatusLabel(item.completionStatus)}</td>
                              <td className="px-4 text-xs">{reviewApprovalLabel(item.approvalStatus, item.assignedToEmployee)}</td>
                              <td className="px-4">
                                <input name={`rating:${item.id}`} type="number" step="0.01" min="1" max="5" defaultValue={item.rating ?? ""} disabled={selectedReview.status === "FINALIZED" || !item.assignedToEmployee} className="h-9 w-20 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60" />
                              </td>
                              <td className="px-4">
                                <input name={`achievement:${item.id}`} type="number" step="0.01" min="0" defaultValue={item.achievementPercent || ""} disabled={selectedReview.status === "FINALIZED"} className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60" />
                              </td>
                              <td className="px-4">
                                <input name={`actual:${item.id}`} defaultValue={item.actualAchievement ?? ""} disabled={selectedReview.status === "FINALIZED"} className="h-9 w-36 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60" />
                              </td>
                              <td className="px-4">
                                <input name={`remarks:${item.id}`} defaultValue={item.remarks ?? ""} disabled={selectedReview.status === "FINALIZED"} className="h-9 w-48 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60" />
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 border-t border-border p-5">
                  <textarea name="overallRemarks" defaultValue={selectedReview.overallRemarks ?? ""} disabled={selectedReview.status === "FINALIZED"} placeholder="Overall remarks" className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60" />
                  <div className="flex flex-wrap justify-end gap-2">
                    {selectedReview.status === "DRAFT" ? (
                      <>
                        <Button type="submit" variant="outline">Save Draft</Button>
                        <Button type="submit" formAction={finalizeKpiReviewAction}>Finalize</Button>
                      </>
                    ) : (
                      <Button type="submit" formAction={reopenKpiReviewAction} variant="outline">Reopen</Button>
                    )}
                  </div>
                </div>
              </form>
            )}
            {selectedReview && selectedReview.kpiTasks.length > 0 && (
              <section className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold">Task Audit Trail</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Human-readable KPI task events and rating explanations. Internal rule JSON is not shown.
                  </p>
                </div>
                <div className="grid gap-3 p-5 lg:grid-cols-2">
                  {selectedReview.kpiTasks.map((task) => (
                    <div key={task.id} className="rounded-lg border border-border bg-muted/10 p-3">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{task.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.criterion.name} - {taskStatusLabel(task.status)}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                          {task.finalRating?.toFixed(2) ?? "Not rated"}
                        </span>
                      </div>
                      {task.ratingExplanation && (
                        <p className="mb-3 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                          {task.ratingExplanation}
                        </p>
                      )}
                      <form action={adminOverrideKpiTaskRatingAction} className="mb-3 grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[110px_1fr_auto]">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input
                          name="rating"
                          type="number"
                          min="0"
                          max="5"
                          step="0.01"
                          defaultValue={task.finalRating ?? ""}
                          placeholder="Rating"
                          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                        />
                        <input
                          name="reason"
                          required
                          placeholder="Admin override reason"
                          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                        />
                        <Button type="submit" size="sm" variant="outline">Override</Button>
                      </form>
                      <KpiTaskTimeline events={task.events} compact />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </FadeIn>
      )}

      {activeTab === "reports" && (
        <FadeIn delay={0.08}>
          <div className="space-y-5">
            <form className="flex items-end gap-3" action="/appraisal/kpi">
              <input type="hidden" name="tab" value="reports" />
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Year</span>
                <input name="year" type="number" defaultValue={reportYear} className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm" />
              </label>
              <Button type="submit" variant="outline">View</Button>
            </form>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Trophy className="size-4 text-primary" /> Monthly Finalized Scores
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Month</th>
                        <th className="px-4 font-medium">Employee</th>
                        <th className="px-4 font-medium">Department</th>
                        <th className="px-4 font-medium">Score</th>
                        <th className="px-4 font-medium">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportRows.map((review) => (
                        <tr key={review.id}>
                          <td className="px-4 py-3">{review.month.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                          <td className="px-4 font-semibold">{toTitleCase(review.user.name)}</td>
                          <td className="px-4 text-muted-foreground">{review.department.name}</td>
                          <td className="px-4 font-bold text-primary">{review.monthlyPointScore.toLocaleString("en-IN")}</td>
                          <td className="px-4 text-xs">{review.performanceCategory}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Trophy className="size-4 text-primary" /> Annual Leaderboard
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {annualRows.map((row, index) => (
                    <div key={row.name} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm font-semibold">{index + 1}. {toTitleCase(row.name)}</p>
                        <p className="text-xs text-muted-foreground">{row.months} finalized month{row.months === 1 ? "" : "s"}</p>
                      </div>
                      <p className="text-lg font-bold text-primary">{row.score.toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

type WorkingCalendarRow = Awaited<ReturnType<typeof loadData>>["workingCalendar"];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

function WorkingCalendarForm({ calendar }: { calendar: WorkingCalendarRow }) {
  const cal = calendar ?? {
    workStartTime: "10:00",
    workEndTime: "17:30",
    timezone: "Asia/Kolkata",
    graceMinutes: 30,
    workingDays: [1, 2, 3, 4, 5, 6],
    breaks: [{ start: "13:00", end: "14:00" }],
    holidays: [] as string[],
  };

  const workingDays = Array.isArray(cal.workingDays)
    ? (cal.workingDays as number[])
    : [1, 2, 3, 4, 5, 6];
  const breaks = Array.isArray(cal.breaks)
    ? (cal.breaks as Array<{ start: string; end: string }>)
    : [];
  const holidays = Array.isArray(cal.holidays) ? (cal.holidays as string[]) : [];

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-sm font-semibold">Working Hours Configuration</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Defines valid working time for KPI task timers. Grace period is added to elapsed time before rating.
        </p>
      </div>

      <form action={saveWorkingCalendarAction} className="space-y-5">
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hours &amp; Timezone</h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Work Start</label>
              <input
                name="workStartTime"
                type="time"
                defaultValue={cal.workStartTime}
                required
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Work End</label>
              <input
                name="workEndTime"
                type="time"
                defaultValue={cal.workEndTime}
                required
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Grace Period (min)</label>
              <input
                name="graceMinutes"
                type="number"
                min="0"
                max="120"
                defaultValue={cal.graceMinutes}
                required
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Timezone</label>
            <select
              name="timezone"
              defaultValue={cal.timezone}
              className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary sm:max-w-xs"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Working Days</h3>
          <div className="flex flex-wrap gap-3">
            {WEEKDAY_LABELS.map((label, idx) => (
              <label key={idx} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="workingDay"
                  value={idx}
                  defaultChecked={workingDays.includes(idx)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Break Times</h3>
          <p className="text-xs text-muted-foreground">Comma-separated list of HH:MM-HH:MM ranges excluded from working time. Example: 13:00-14:00, 16:00-16:15</p>
          <textarea
            name="breaks"
            rows={3}
            defaultValue={breaks.map((b) => `${b.start}-${b.end}`).join(", ")}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="13:00-14:00, 16:00-16:15"
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Public Holidays</h3>
          <p className="text-xs text-muted-foreground">One date per line or comma-separated, in YYYY-MM-DD format. Timer does not run on these days.</p>
          <textarea
            name="holidays"
            rows={5}
            defaultValue={holidays.join("\n")}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={"2026-01-01\n2026-08-15\n2026-10-02"}
          />
        </section>

        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Save Working Calendar
        </button>
      </form>
    </div>
  );
}

type CriterionRow = Awaited<ReturnType<typeof loadData>>["criteria"][number];

const RULE_TYPE_LABELS: Record<string, string> = {
  TURNAROUND_TIME: "Turnaround Time",
  DUE_DATE: "Due Date",
  RECURRING_WEEKLY_DUE_DATE: "Recurring Weekly",
  MANUAL: "Manual",
  HYBRID: "Hybrid",
};

const APPROVAL_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending TL", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  APPROVED: { label: "Approved", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  DISAPPROVED: { label: "Disapproved", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

function CriteriaTab({
  criteria,
  departments,
}: {
  criteria: CriterionRow[];
  departments: Department[];
}) {
  const rootDepts = departments.filter((d) => !d.parentId);
  const byDept = new Map<string, CriterionRow[]>();
  for (const c of criteria) {
    const arr = byDept.get(c.departmentId) ?? [];
    arr.push(c);
    byDept.set(c.departmentId, arr);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Admin-defined criteria with rule types. TL approves each criterion before tasks can be created under it.
          </p>
        </div>
        <CriteriaFormToggle departments={departments} />
      </div>

      {criteria.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <ListChecks className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">No criteria yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a criterion above and assign it to a department. The TL will then approve it.
          </p>
        </div>
      )}

      {rootDepts.map((dept) => {
        const deptCriteria = byDept.get(dept.id) ?? [];
        if (deptCriteria.length === 0) return null;
        const totalWeight = deptCriteria
          .filter((c) => c.status === "ACTIVE" && c.approvalStatus === "APPROVED")
          .reduce((sum, c) => sum + c.weightage, 0);
        return (
          <section key={dept.id} className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="size-4 text-primary" /> {dept.name}
              </h2>
              {totalWeight > 0 && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    Math.abs(totalWeight - 100) < 0.01
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  Approved: {totalWeight.toFixed(1)}% / 100%
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-205">
                <div className="grid grid-cols-[1fr_110px_140px_120px_100px_140px] border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground">
                  <span>Criterion</span>
                  <span>Weight</span>
                  <span>Rule Type</span>
                  <span>TL Approval</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-border">
                  {deptCriteria.map((c) => {
                    const approval = APPROVAL_BADGE[c.approvalStatus] ?? APPROVAL_BADGE.PENDING;
                    return (
                      <div key={c.id}>
                        <div className="grid grid-cols-[1fr_110px_140px_120px_100px_140px] items-center px-5 py-3">
                          <div>
                            <p className="text-sm font-medium">{c.name}</p>
                            {c.description && (
                              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                            )}
                            {c.division && (
                              <span className="mt-1 inline-block rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                Division: {c.division.name}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold">{c.weightage}%</span>
                          <span className="text-xs text-muted-foreground">
                            {RULE_TYPE_LABELS[c.ruleType] ?? c.ruleType}
                          </span>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${approval.className}`}
                          >
                            {approval.label}
                          </span>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              c.status === "ACTIVE"
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                          <div className="flex items-center justify-end gap-2">
                            <CriteriaEditInline criterion={c} departments={departments} />
                            <form action={toggleKpiCriterionStatusAction}>
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="currentStatus" value={c.status} />
                              <button
                                type="submit"
                                className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
                              >
                                {c.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

