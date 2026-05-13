import Link from "next/link";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { toTitleCase } from "@/lib/utils";
import { Users, UserCheck, Building2 } from "lucide-react";
import {
  assignEmployeesToTlAction,
  assignTlsToManagerAction,
  unassignEmployeeFromTlAction,
  unassignTlFromManagerAction,
} from "./actions";

type SearchParams = { tab?: string };

async function loadData() {
  const [users, kpiDepartments] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: { notIn: ["MANAGEMENT", "PARTNER", "ADMIN"] } },
      orderBy: [{ employeeNumber: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        employeeNumber: true,
        department: true,
        designation: true,
        email: true,
        kpiDepartmentId: true,
        kpiDepartment: { select: { id: true, name: true, parentId: true } },
        reportingManagerId: true,
        reportingManager: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.kpiDepartment.findMany({
      where: { active: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  return { users, kpiDepartments };
}

function TabLink({ tab, activeTab, children }: { tab: string; activeTab: string; children: React.ReactNode }) {
  const active = tab === activeTab;
  return (
    <Link
      href={`/workspace/hrms/ownership?tab=${tab}`}
      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function OwnershipPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Access denied.</div>;
  }

  const sp = await searchParams;
  const activeTab = ["tl", "manager", "departments"].includes(sp.tab ?? "") ? sp.tab! : "tl";
  const { users, kpiDepartments } = await loadData();

  const tlUsers = users.filter((u) => u.role === "TL");
  const managerUsers = users.filter((u) => u.role === "MANAGER");
  const appraisableNonTl = users.filter((u) => !["TL", "MANAGER", "HR", "REVIEWER"].includes(u.role));
  const allTls = users.filter((u) => u.role === "TL");

  // TL â†’ employees map
  const employeesByTl = new Map<string, typeof users>();
  for (const tl of tlUsers) employeesByTl.set(tl.id, []);
  const unassignedEmployees = appraisableNonTl.filter((u) => {
    if (u.reportingManager?.role === "TL" && u.reportingManagerId) {
      employeesByTl.set(u.reportingManagerId, [...(employeesByTl.get(u.reportingManagerId) ?? []), u]);
      return false;
    }
    return true;
  });

  // Manager â†’ TLs map
  const tlsByManager = new Map<string, typeof tlUsers>();
  for (const mgr of managerUsers) tlsByManager.set(mgr.id, []);
  const unassignedTls = allTls.filter((tl) => {
    if (tl.reportingManager?.role === "MANAGER" && tl.reportingManagerId) {
      tlsByManager.set(tl.reportingManagerId, [...(tlsByManager.get(tl.reportingManagerId) ?? []), tl]);
      return false;
    }
    return true;
  });

  // KPI dept hierarchy
  const rootDepts = kpiDepartments.filter((d) => !d.parentId);
  const divisionsByDept = new Map<string, typeof kpiDepartments>();
  for (const div of kpiDepartments.filter((d) => d.parentId)) {
    divisionsByDept.set(div.parentId!, [...(divisionsByDept.get(div.parentId!) ?? []), div]);
  }
  const usersByKpiDept = new Map<string, typeof users>();
  for (const u of users) {
    if (!u.kpiDepartmentId) continue;
    usersByKpiDept.set(u.kpiDepartmentId, [...(usersByKpiDept.get(u.kpiDepartmentId) ?? []), u]);
  }

  return (
    <div className="max-w-7xl space-y-5">
      <FadeIn>
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Ownership" }]} />
          <h1 className="ds-h1">Ownership</h1>
          <p className="ds-body mt-1">Assign employees to TLs, TLs to Managers, and view department hierarchy.</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.04}>
        <div className="flex flex-wrap gap-2">
          <TabLink tab="tl" activeTab={activeTab}>TL Ownership</TabLink>
          <TabLink tab="manager" activeTab={activeTab}>Manager Ownership</TabLink>
          <TabLink tab="departments" activeTab={activeTab}>Department / Division Mapping</TabLink>
        </div>
      </FadeIn>

      {/* â”€â”€ TL Ownership â”€â”€ */}
      {activeTab === "tl" && (
        <FadeIn delay={0.08}>
          <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
            {/* TL list with employees */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <UserCheck className="size-4 text-primary" /> TL Assignments
              </h2>
              {tlUsers.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  No TL users found.
                </div>
              )}
              {tlUsers.map((tl) => {
                const owned = employeesByTl.get(tl.id) ?? [];
                return (
                  <div key={tl.id} className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{toTitleCase(tl.name)}</p>
                        <p className="text-[11px] text-muted-foreground">{tl.department ?? "No department"} Â· TL</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{owned.length} employee{owned.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {owned.map((emp) => (
                        <div key={emp.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {emp.employeeNumber ? `${emp.employeeNumber} â€“ ` : ""}{toTitleCase(emp.name)}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">{emp.department ?? "â€”"} Â· {emp.designation ?? emp.role}</p>
                          </div>
                          <form action={unassignEmployeeFromTlAction}>
                            <input type="hidden" name="employeeId" value={emp.id} />
                            <Button type="submit" variant="outline" size="sm" className="text-red-600 hover:text-red-700 text-[11px]">Remove</Button>
                          </form>
                        </div>
                      ))}
                      {owned.length === 0 && (
                        <p className="px-4 py-3 text-[11px] text-muted-foreground">No employees assigned.</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {unassignedEmployees.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Unassigned employees ({unassignedEmployees.length})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {unassignedEmployees.map((u) => (
                      <span key={u.id} className="rounded border border-amber-200 bg-background px-2 py-0.5 text-[11px] text-muted-foreground dark:border-amber-900">
                        {u.employeeNumber ? `${u.employeeNumber} â€“ ` : ""}{toTitleCase(u.name)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Assign form */}
            <section>
              <form action={assignEmployeesToTlAction} className="rounded-xl border border-border bg-card p-4 space-y-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-primary" /> Assign Employees to TL
                </h2>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Team Lead</label>
                  <select name="tlId" required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                    <option value="">Choose TL</option>
                    {tlUsers.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.employeeNumber ? `${tl.employeeNumber} â€“ ` : ""}{toTitleCase(tl.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Employees (select one or more)</label>
                  <div className="max-h-[380px] space-y-1 overflow-y-auto rounded-md border border-border p-2">
                    {appraisableNonTl.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40 cursor-pointer">
                        <input type="checkbox" name="employeeId" value={u.id} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {u.employeeNumber ? `${u.employeeNumber} â€“ ` : ""}{toTitleCase(u.name)}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {u.reportingManager?.role === "TL" ? toTitleCase(u.reportingManager.name) : "Unassigned"}
                        </span>
                      </label>
                    ))}
                    {appraisableNonTl.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">No appraisable employees found.</p>
                    )}
                  </div>
                </div>
                <Button type="submit" className="w-full">Assign Selected Employees</Button>
              </form>
            </section>
          </div>
        </FadeIn>
      )}

      {/* â”€â”€ Manager Ownership â”€â”€ */}
      {activeTab === "manager" && (
        <FadeIn delay={0.08}>
          <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
            {/* Manager hierarchy */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <UserCheck className="size-4 text-primary" /> Manager Hierarchy
              </h2>
              {managerUsers.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  No Manager users found.
                </div>
              )}
              {managerUsers.map((mgr) => {
                const ownedTls = tlsByManager.get(mgr.id) ?? [];
                const totalEmployees = ownedTls.reduce((sum, tl) => sum + (employeesByTl.get(tl.id)?.length ?? 0), 0);
                return (
                  <div key={mgr.id} className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{toTitleCase(mgr.name)}</p>
                        <p className="text-[11px] text-muted-foreground">{mgr.department ?? "No department"} Â· Manager</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {ownedTls.length} TL{ownedTls.length === 1 ? "" : "s"} Â· {totalEmployees} employee{totalEmployees === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {ownedTls.map((tl) => {
                        const tlEmployees = employeesByTl.get(tl.id) ?? [];
                        return (
                          <div key={tl.id} className="px-4 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground">
                                {toTitleCase(tl.name)}
                                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">TL</span>
                              </p>
                              <form action={unassignTlFromManagerAction} className="flex items-center gap-1">
                                <input type="hidden" name="tlId" value={tl.id} />
                                <Button type="submit" variant="outline" size="sm" className="text-red-600 hover:text-red-700 text-[11px]">Remove</Button>
                              </form>
                            </div>
                            {tlEmployees.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 pl-3 border-l border-border">
                                {tlEmployees.map((emp) => (
                                  <span key={emp.id} className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                                    {emp.employeeNumber ? `${emp.employeeNumber} â€“ ` : ""}{toTitleCase(emp.name)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {tlEmployees.length === 0 && (
                              <p className="mt-1 pl-3 text-[11px] text-muted-foreground">No employees under this TL.</p>
                            )}
                          </div>
                        );
                      })}
                      {ownedTls.length === 0 && (
                        <p className="px-4 py-3 text-[11px] text-muted-foreground">No TLs assigned.</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {unassignedTls.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Unassigned TLs ({unassignedTls.length})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {unassignedTls.map((tl) => (
                      <span key={tl.id} className="rounded border border-amber-200 bg-background px-2 py-0.5 text-[11px] text-muted-foreground dark:border-amber-900">
                        {toTitleCase(tl.name)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Assign TLs to manager form */}
            <section>
              <form action={assignTlsToManagerAction} className="rounded-xl border border-border bg-card p-4 space-y-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-primary" /> Assign TLs to Manager
                </h2>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Manager</label>
                  <select name="managerId" required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                    <option value="">Choose Manager</option>
                    {managerUsers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.employeeNumber ? `${mgr.employeeNumber} â€“ ` : ""}{toTitleCase(mgr.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">TLs (select one or more)</label>
                  <div className="max-h-[320px] space-y-1 overflow-y-auto rounded-md border border-border p-2">
                    {allTls.map((tl) => (
                      <label key={tl.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40 cursor-pointer">
                        <input type="checkbox" name="tlId" value={tl.id} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {tl.employeeNumber ? `${tl.employeeNumber} â€“ ` : ""}{toTitleCase(tl.name)}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {tl.reportingManager?.role === "MANAGER" ? toTitleCase(tl.reportingManager.name) : "Unassigned"}
                        </span>
                      </label>
                    ))}
                    {allTls.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">No TL users found.</p>
                    )}
                  </div>
                </div>
                <Button type="submit" className="w-full">Assign Selected TLs</Button>
              </form>
            </section>
          </div>
        </FadeIn>
      )}

      {/* â”€â”€ Department / Division Mapping â”€â”€ */}
      {activeTab === "departments" && (
        <FadeIn delay={0.08}>
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="size-4 text-primary" /> Department / Division Hierarchy
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Department / Division</th>
                    <th className="px-4 font-medium">Manager</th>
                    <th className="px-4 font-medium">TL</th>
                    <th className="px-4 font-medium">Employees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rootDepts.map((dept) => {
                    const divisions = divisionsByDept.get(dept.id) ?? [];
                    const deptUsers = usersByKpiDept.get(dept.id) ?? [];
                    const deptTls = deptUsers.filter((u) => u.role === "TL");
                    const deptManagers = deptUsers.filter((u) => u.role === "MANAGER");
                    const deptEmployees = deptUsers.filter((u) => !["TL", "MANAGER", "ADMIN"].includes(u.role));

                    if (divisions.length === 0) {
                      return (
                        <tr key={dept.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-semibold text-foreground">{dept.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {deptManagers.length > 0 ? deptManagers.map((m) => toTitleCase(m.name)).join(", ") : "â€”"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {deptTls.length > 0 ? deptTls.map((t) => toTitleCase(t.name)).join(", ") : "â€”"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {deptEmployees.length > 0 ? (
                              <span>{deptEmployees.length} employee{deptEmployees.length === 1 ? "" : "s"}</span>
                            ) : "â€”"}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <>
                        <tr key={dept.id} className="bg-muted/30">
                          <td className="px-4 py-3 font-bold text-foreground" colSpan={4}>
                            {dept.name}
                            <span className="ml-2 text-[11px] font-normal text-muted-foreground">{divisions.length} division{divisions.length === 1 ? "" : "s"}</span>
                          </td>
                        </tr>
                        {divisions.map((div) => {
                          const divUsers = usersByKpiDept.get(div.id) ?? [];
                          const divTls = divUsers.filter((u) => u.role === "TL");
                          const divManagers = divUsers.filter((u) => u.role === "MANAGER");
                          const divEmployees = divUsers.filter((u) => !["TL", "MANAGER", "ADMIN"].includes(u.role));
                          return (
                            <tr key={div.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 pl-8 text-foreground">
                                <span className="text-muted-foreground mr-1.5">â””</span>{div.name}
                                <span className="ml-2 text-[11px] text-muted-foreground">Division</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {divManagers.length > 0 ? divManagers.map((m) => toTitleCase(m.name)).join(", ") : "â€”"}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {divTls.length > 0 ? divTls.map((t) => toTitleCase(t.name)).join(", ") : "â€”"}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {divEmployees.length > 0 ? (
                                  <span>{divEmployees.length} employee{divEmployees.length === 1 ? "" : "s"}</span>
                                ) : "â€”"}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                  {rootDepts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                        No KPI departments found. Configure departments in the KPI module.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Manager and TL columns show users whose KPI department matches this row. Set TL/Manager assignments in the TL and Manager tabs.
            </p>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

