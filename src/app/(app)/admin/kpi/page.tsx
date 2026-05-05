import Link from "next/link";
import { Fragment } from "react";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Button } from "@/components/ui/button";
import {
  assignEmployeeKpiDepartmentAction,
  bulkAssignEmployeesToTlAction,
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
} from "./actions";
import {
  DEFAULT_KPI_MONTHLY_TARGET,
  KPI_MONTHLY_TARGET_SETTING,
  KPI_RATING_SCALE_SETTING,
  monthStart,
  parseKpiRatingScale,
} from "@/lib/kpi";
import { toTitleCase } from "@/lib/utils";
import { Building2, ChevronRight, ListChecks, Trophy, Users } from "lucide-react";
import { TemplateDepartmentPicker } from "./template-department-picker";

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
      },
    }),
    prisma.systemSetting.findMany({
      where: { key: { in: [KPI_MONTHLY_TARGET_SETTING, KPI_RATING_SCALE_SETTING] } },
    }),
  ]);
  return { departments, users, templates, reviews, settings };
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
  const activeTab = ["departments", "templates", "scores", "reports"].includes(sp.tab ?? "")
    ? sp.tab!
    : "departments";
  const { departments, users, templates, reviews, settings } = await loadData();
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
  const tlUsers = users.filter((user) => user.role === "TL");
  const appraisableUsers = users.filter((user) => !["MANAGEMENT", "PARTNER"].includes(user.role));
  const usersByTl = new Map<string, typeof users>();
  for (const tl of tlUsers) usersByTl.set(tl.id, []);
  const unassignedTlUsers = appraisableUsers.filter((user) => {
    if (user.role === "TL") return false;
    if (user.reportingManager?.role !== "TL") return true;
    usersByTl.set(user.reportingManagerId!, [...(usersByTl.get(user.reportingManagerId!) ?? []), user]);
    return false;
  });

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
          <TabLink tab="scores" activeTab={activeTab}>Monthly Scores</TabLink>
          <TabLink tab="reports" activeTab={activeTab}>Reports</TabLink>
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

              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-primary" /> TL Employee Ownership
                </h2>
                <form action={bulkAssignEmployeesToTlAction} className="space-y-3 rounded-lg border border-border p-3">
                  <select name="tlId" required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                    <option value="">Choose TL</option>
                    {tlUsers.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.employeeNumber ? `${tl.employeeNumber} - ` : ""}{toTitleCase(tl.name)}
                      </option>
                    ))}
                  </select>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                    {appraisableUsers.filter((user) => user.role !== "TL").map((user) => (
                      <label key={user.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/40">
                        <input type="checkbox" name="employeeId" value={user.id} />
                        <span className="min-w-0 flex-1 truncate">
                          {user.employeeNumber ? `${user.employeeNumber} - ` : ""}{toTitleCase(user.name)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {user.reportingManager?.role === "TL" ? toTitleCase(user.reportingManager.name) : "Unassigned"}
                        </span>
                      </label>
                    ))}
                  </div>
                  <Button type="submit" variant="outline" className="w-full">Assign Selected Employees</Button>
                </form>
                <div className="space-y-3">
                  {tlUsers.map((tl) => {
                    const ownedUsers = usersByTl.get(tl.id) ?? [];
                    return (
                      <div key={tl.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">{toTitleCase(tl.name)}</p>
                          <span className="text-[10px] text-muted-foreground">{ownedUsers.length} employee{ownedUsers.length === 1 ? "" : "s"}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ownedUsers.map((user) => (
                            <span key={user.id} className="rounded border border-border bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
                              {user.employeeNumber ? `${user.employeeNumber} - ` : ""}{toTitleCase(user.name)}
                            </span>
                          ))}
                          {ownedUsers.length === 0 && <span className="text-[11px] text-muted-foreground">No employees assigned.</span>}
                        </div>
                      </div>
                    );
                  })}
                  {unassignedTlUsers.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Unassigned employees</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {unassignedTlUsers.map((user) => (
                          <span key={user.id} className="rounded border border-amber-200 bg-background px-2 py-1 text-[10px] text-muted-foreground dark:border-amber-900">
                            {user.employeeNumber ? `${user.employeeNumber} - ` : ""}{toTitleCase(user.name)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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

      {activeTab === "scores" && (
        <FadeIn delay={0.08}>
          <div className="space-y-5">
            <form className="flex flex-wrap items-end gap-3" action="/admin/kpi">
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
                              <td className="px-4 text-xs">{item.completionStatus.replaceAll("_", " ")}</td>
                              <td className="px-4 text-xs">{item.approvalStatus}{item.assignedToEmployee ? " / Assigned" : " / Not assigned"}</td>
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
          </div>
        </FadeIn>
      )}

      {activeTab === "reports" && (
        <FadeIn delay={0.08}>
          <div className="space-y-5">
            <form className="flex items-end gap-3" action="/admin/kpi">
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
