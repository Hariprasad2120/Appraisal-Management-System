"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Cog,
  Layers3,
  Lock,
  Mail,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getModuleDefinition } from "@/lib/module-catalog";
import type { getOrganizationHubData, OrganizationHubTabKey } from "@/lib/organization-hub";
import {
  toggleOrganizationModuleAction,
  updateOrganizationProfileAction,
} from "@/app/account/dashboard/actions";

type OrganizationHubData = NonNullable<Awaited<ReturnType<typeof getOrganizationHubData>>>;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${tone}`}>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function OrganizationHubDashboard({
  data,
  activeTab,
}: {
  data: OrganizationHubData;
  activeTab: OrganizationHubTabKey;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [departmentQuery, setDepartmentQuery] = useState("");
  const deferredEmployeeQuery = useDeferredValue(employeeQuery);
  const deferredDepartmentQuery = useDeferredValue(departmentQuery);
  const employeeLookup = useMemo(
    () => new Map(data.employeeTree.map((person) => [person.id, person])),
    [data.employeeTree],
  );

  const employeeSearch = deferredEmployeeQuery.trim().toLowerCase();
  const departmentSearch = deferredDepartmentQuery.trim().toLowerCase();

  const employeeTreeNodes = useMemo(() => {
    const parentById = new Map<string, string | null>();
    const childrenByParent = new Map<string | null, string[]>();

    for (const person of data.employeeTree) {
      const parentId = person.teamLeadId ?? person.managerId ?? person.managementId ?? null;
      parentById.set(person.id, parentId && employeeLookup.has(parentId) ? parentId : null);
    }

    for (const person of data.employeeTree) {
      const parentId = parentById.get(person.id) ?? null;
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), person.id]);
    }

    const matchesTree = (personId: string): boolean => {
      const person = employeeLookup.get(personId);
      if (!person) return false;
      const haystack = [
        person.name,
        person.email,
        person.branchName,
        person.departmentName,
        person.designation,
        person.primaryRole,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!employeeSearch) return true;
      if (haystack.includes(employeeSearch)) return true;
      return (childrenByParent.get(personId) ?? []).some((childId) => matchesTree(childId));
    };

    return { parentById, childrenByParent, matchesTree };
  }, [data.employeeTree, employeeLookup, employeeSearch]);

  const filteredBranches = useMemo(() => {
    if (!departmentSearch) {
      return data.branches;
    }
    return data.branches
      .map((branch) => ({
        ...branch,
        departments: branch.departments.filter((department) =>
          [branch.name, department.name, department.code, ...department.leads.map((lead) => lead.name)]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(departmentSearch),
        ),
      }))
      .filter(
        (branch) =>
          branch.name.toLowerCase().includes(departmentSearch) || branch.departments.length > 0,
      );
  }, [data.branches, departmentSearch]);

  const filteredUnassignedDepartments = useMemo(() => {
    if (!departmentSearch) return data.unassignedDepartments;
    return data.unassignedDepartments.filter((department) =>
      [department.name, department.code, ...department.leads.map((lead) => lead.name)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(departmentSearch),
    );
  }, [data.unassignedDepartments, departmentSearch]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-[#2b335f] px-5 py-4 text-white">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-white/85">My Space</span>
            <span className="font-medium text-white/70">Team</span>
            <span className="border-b-2 border-primary pb-2 font-semibold text-white">Organization</span>
          </div>
        </div>

        <div className="border-b border-border bg-background px-5 py-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {data.tabs.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <Link
                  key={tab.key}
                  href={`/account/dashboard?tab=${tab.key}`}
                  className={`border-b-2 px-1 pb-2 transition ${
                    isActive
                      ? "border-primary font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,138,149,0.22),transparent_35%),linear-gradient(135deg,#17323b_0%,#0f1f26_55%,#15293a_100%)] px-5 py-6 text-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.04),transparent)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl border border-white/15 bg-white p-3 shadow-lg">
                {data.organization.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.organization.logoUrl} alt={data.organization.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center text-sm font-semibold text-slate-700">{data.organization.name.slice(0, 2).toUpperCase()}</div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
                  Organization overview
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{data.organization.name}</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/75">
                  Role access is tailored for {data.userContext.roleLabels.join(", ")}. Enabled modules, structure views, and organization context update from this hub.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/75">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                    {data.organization.status}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                    {data.organization.account.name}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                    {data.stats.enabledModuleCount} modules enabled
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/account/organizations"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <Users className="size-4" />
                Change workspace
              </Link>
              {data.userContext.canEditOrganization ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white/90"
                >
                  <Cog className="size-4" />
                  Edit organization
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Branches" value={data.stats.branchCount} tone="border-t-4 border-t-primary" />
        <StatCard label="Departments" value={data.stats.departmentCount} tone="border-t-4 border-t-cyan-500" />
        <StatCard label="People" value={data.stats.memberCount} tone="border-t-4 border-t-amber-500" />
        <StatCard label="Enabled modules" value={data.stats.enabledModuleCount} tone="border-t-4 border-t-orange-500" />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Module switcher</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enabled modules open their workspace. Locked modules stay visible so admins can control rollout from here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.modules.map((moduleRow) => (
              <Link
                key={moduleRow.key}
                href={moduleRow.enabled && moduleRow.launchHref ? moduleRow.launchHref : `/account/dashboard?tab=modules`}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  moduleRow.enabled
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {moduleRow.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {activeTab === "overview" ? <OverviewTab data={data} onEdit={() => setEditOpen(true)} /> : null}
      {activeTab === "employee-tree" ? (
        <EmployeeTreeTab
          employeeLookup={employeeLookup}
          search={employeeQuery}
          setSearch={setEmployeeQuery}
          matchesTree={employeeTreeNodes.matchesTree}
          childrenByParent={employeeTreeNodes.childrenByParent}
        />
      ) : null}
      {activeTab === "department-tree" ? (
        <DepartmentTreeTab
          branches={filteredBranches}
          unassignedDepartments={filteredUnassignedDepartments}
          search={departmentQuery}
          setSearch={setDepartmentQuery}
        />
      ) : null}
      {activeTab === "department-directory" ? <DepartmentDirectoryTab branches={data.branches} unassignedDepartments={data.unassignedDepartments} /> : null}
      {activeTab === "birthday-folks" ? <BirthdayTab birthdays={data.birthdays} /> : null}
      {activeTab === "new-hires" ? <NewHiresTab newHires={data.newHires} /> : null}
      {activeTab === "calendar" ? <CalendarTab items={data.calendarItems} /> : null}
      {activeTab === "announcements" ? <TemplateTab title={data.placeholders.announcements.title} description={data.placeholders.announcements.description} /> : null}
      {activeTab === "policies" ? <TemplateTab title={data.placeholders.policies.title} description={data.placeholders.policies.description} /> : null}
      {activeTab === "modules" ? <ModulesTab data={data} /> : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit organization profile</DialogTitle>
          </DialogHeader>
          <form action={updateOrganizationProfileAction} className="grid gap-3 md:grid-cols-2" encType="multipart/form-data">
            <input type="hidden" name="organizationId" value={data.organization.id} />
            <Field label="Organization name" name="name" defaultValue={data.organization.name} required />
            <Field label="Legal name" name="legalName" defaultValue={data.organization.legalName ?? ""} />
            <Field label="Industry" name="industry" defaultValue={data.organization.industry ?? ""} />
            <Field label="Contact email" name="contactEmail" type="email" defaultValue={data.organization.contactEmail ?? ""} />
            <Field label="Contact phone" name="contactPhone" defaultValue={data.organization.contactPhone ?? ""} />
            <Field label="Timezone" name="timezone" defaultValue={data.organization.settings?.timezone ?? "Asia/Kolkata"} required />
            <Field label="Locale" name="locale" defaultValue={data.organization.settings?.locale ?? "en-IN"} required />
            <Field label="Date format" name="dateFormat" defaultValue={data.organization.settings?.dateFormat ?? "dd/MM/yyyy"} required />
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Organization logo</label>
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a new logo to replace the current organization branding across sidebars and overview surfaces.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
              <textarea
                name="address"
                defaultValue={data.organization.address ?? ""}
                className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                Save organization
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverviewTab({
  data,
  onEdit,
}: {
  data: OrganizationHubData;
  onEdit: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr,1.6fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" />
            Organization details
          </div>
          <div className="mt-5 space-y-4 text-sm">
            <InfoRow icon={<MapPin className="size-4 text-primary" />} label="Address" value={data.organization.address ?? "Address not added yet"} />
            <InfoRow icon={<Mail className="size-4 text-primary" />} label="Email" value={data.organization.contactEmail ?? "Contact email not added"} />
            <InfoRow icon={<Phone className="size-4 text-primary" />} label="Phone" value={data.organization.contactPhone ?? "Contact phone not added"} />
            <InfoRow icon={<Layers3 className="size-4 text-primary" />} label="Industry" value={data.organization.industry ?? "Not specified"} />
            <InfoRow icon={<CalendarDays className="size-4 text-primary" />} label="Workspace since" value={formatDate(data.organization.createdAt)} />
          </div>
          {data.userContext.canEditOrganization ? (
            <button
              type="button"
              onClick={onEdit}
              className="mt-5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Update details
            </button>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">Quick signals</h3>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              {data.birthdays.length > 0
                ? `${data.birthdays[0].name}'s birthday is next in ${data.birthdays[0].daysUntil} day(s).`
                : "Birthday data will appear here once employee DOB records are filled in."}
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              {data.newHires.length > 0
                ? `${data.newHires[0].name} is the most recent addition to this organization.`
                : "New member updates will appear here as people are added to the organization."}
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Services</h3>
              <p className="mt-1 text-sm text-muted-foreground">Modules stay visible to everyone. Admins can control rollout without leaving the dashboard.</p>
            </div>
            <Link href="/account/dashboard?tab=modules" className="text-sm font-medium text-primary hover:underline">
              Manage modules
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.modules.map((moduleRow) => {
              const moduleDef = getModuleDefinition(moduleRow.key);
              if (!moduleDef) return null;
              const Icon = moduleDef.icon;
              return (
                <div key={moduleRow.key} className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/25 hover:bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className={`flex size-11 items-center justify-center rounded-2xl ${moduleDef.accentClass}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-foreground">{moduleRow.name}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${moduleDef.badgeClass}`}>
                          {moduleRow.enabled ? "Enabled" : "Locked"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{moduleRow.description}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{moduleRow.statusLabel}</span>
                        {moduleRow.enabled && moduleRow.launchHref ? (
                          <Link href={moduleRow.launchHref} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                            Open
                            <ChevronRight className="size-4" />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Lock className="size-3.5" />
                            Enable to use
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Calendar preview</h3>
              <p className="mt-1 text-sm text-muted-foreground">Upcoming holidays and appraisal checkpoints.</p>
            </div>
            <Link href="/account/dashboard?tab=calendar" className="text-sm font-medium text-primary hover:underline">
              Open calendar
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.calendarItems.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.meta}</div>
                </div>
                <div className="text-xs font-medium text-muted-foreground">{formatLongDate(item.date)}</div>
              </div>
            ))}
            {data.calendarItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                Upcoming organization dates will appear here.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmployeeTreeTab({
  employeeLookup,
  search,
  setSearch,
  matchesTree,
  childrenByParent,
}: {
  employeeLookup: Map<string, OrganizationHubData["employeeTree"][number]>;
  search: string;
  setSearch: (value: string) => void;
  matchesTree: (personId: string) => boolean;
  childrenByParent: Map<string | null, string[]>;
}) {
  const roots = (childrenByParent.get(null) ?? []).filter((id) => matchesTree(id));

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Employee tree</h2>
          <p className="mt-1 text-sm text-muted-foreground">Search the organization chart by name, branch, department, designation, or role.</p>
        </div>
        <label className="relative block w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people or teams"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm"
          />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        {roots.map((rootId) => (
          <EmployeeNode
            key={rootId}
            personId={rootId}
            employeeLookup={employeeLookup}
            childrenByParent={childrenByParent}
            matchesTree={matchesTree}
            level={0}
          />
        ))}
        {roots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
            No employees matched the current search.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EmployeeNode({
  personId,
  employeeLookup,
  childrenByParent,
  matchesTree,
  level,
}: {
  personId: string;
  employeeLookup: Map<string, OrganizationHubData["employeeTree"][number]>;
  childrenByParent: Map<string | null, string[]>;
  matchesTree: (personId: string) => boolean;
  level: number;
}) {
  const person = employeeLookup.get(personId);
  if (!person) return null;
  const children = (childrenByParent.get(personId) ?? []).filter((childId) => matchesTree(childId));

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl border border-border bg-background p-4"
        style={{ marginLeft: `${Math.min(level, 4) * 20}px` }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">{person.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {[person.designation, person.departmentName, person.branchName].filter(Boolean).join(" · ") || "No department assigned"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground">
              {person.primaryRole}
            </span>
            {person.employeeNumber ? (
              <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                #{person.employeeNumber}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
          <div>{person.email}</div>
          <div>Joined {formatDate(person.joinedAt)}</div>
          <div>
            Reports to {person.teamLeadName ?? person.managerName ?? person.managementName ?? "No reporting line"}
          </div>
        </div>
      </div>

      {children.map((childId) => (
        <EmployeeNode
          key={childId}
          personId={childId}
          employeeLookup={employeeLookup}
          childrenByParent={childrenByParent}
          matchesTree={matchesTree}
          level={level + 1}
        />
      ))}
    </div>
  );
}

function DepartmentTreeTab({
  branches,
  unassignedDepartments,
  search,
  setSearch,
}: {
  branches: OrganizationHubData["branches"];
  unassignedDepartments: OrganizationHubData["unassignedDepartments"];
  search: string;
  setSearch: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Department tree</h2>
          <p className="mt-1 text-sm text-muted-foreground">Explore branches and departments with ownership and member counts.</p>
        </div>
        <label className="relative block w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search branches or departments"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm"
          />
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {branches.map((branch) => (
          <div key={branch.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-foreground">{branch.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {[branch.location, branch.code].filter(Boolean).join(" · ") || "No location metadata"}
                </div>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {branch.memberCount} members
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {branch.departments.map((department) => (
                <div key={department.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{department.name}</div>
                      <div className="text-xs text-muted-foreground">{department.code ?? "No code"}</div>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                      {department.memberCount} members
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {department.leads.length > 0
                      ? department.leads.map((lead) => `${lead.name} (${lead.role})`).join(", ")
                      : "No department leadership assigned yet."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {unassignedDepartments.length > 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background p-4">
            <h3 className="text-sm font-semibold text-foreground">Departments without a branch</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {unassignedDepartments.map((department) => (
                <div key={department.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="text-sm font-semibold text-foreground">{department.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {department.memberCount} members · {department.code ?? "No code"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DepartmentDirectoryTab({
  branches,
  unassignedDepartments,
}: {
  branches: OrganizationHubData["branches"];
  unassignedDepartments: OrganizationHubData["unassignedDepartments"];
}) {
  const departments = [
    ...branches.flatMap((branch) =>
      branch.departments.map((department) => ({
        ...department,
        branchName: branch.name,
      })),
    ),
    ...unassignedDepartments.map((department) => ({
      ...department,
      branchName: "Unassigned",
    })),
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Department directory</h2>
      <p className="mt-1 text-sm text-muted-foreground">A quick directory for branch, department, leadership, and current member counts.</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Members</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {departments.map((department) => (
              <tr key={department.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{department.name}</div>
                  <div className="text-xs text-muted-foreground">{department.code ?? "No code"}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{department.branchName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {department.leads.length > 0
                    ? department.leads.map((lead) => lead.name).join(", ")
                    : "Not assigned"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{department.memberCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BirthdayTab({ birthdays }: { birthdays: OrganizationHubData["birthdays"] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Birthday folks</h2>
      <p className="mt-1 text-sm text-muted-foreground">Upcoming birthdays are derived from the employee DOB records already in the system.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {birthdays.map((person) => (
          <div key={person.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="text-sm font-semibold text-foreground">{person.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {[person.departmentName, person.designation].filter(Boolean).join(" · ") || person.primaryRole}
            </div>
            <div className="mt-4 text-sm font-medium text-primary">{formatLongDate(person.nextBirthday)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{person.daysUntil} day(s) to go</div>
          </div>
        ))}
        {birthdays.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
            Add employee birthdays to show celebration reminders here.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function NewHiresTab({ newHires }: { newHires: OrganizationHubData["newHires"] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">New hires</h2>
      <p className="mt-1 text-sm text-muted-foreground">Recent additions are based on active organization membership dates.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {newHires.map((person) => (
          <div key={person.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">{person.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {[person.departmentName, person.designation].filter(Boolean).join(" · ") || person.primaryRole}
                </div>
              </div>
              <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                {formatDate(person.joinedAt)}
              </span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{person.email}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CalendarTab({ items }: { items: OrganizationHubData["calendarItems"] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Calendar</h2>
      <p className="mt-1 text-sm text-muted-foreground">Upcoming dates combine configured holidays and appraisal checkpoints already present in the database.</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.meta}</div>
            </div>
            <div className="text-xs font-medium text-muted-foreground">{formatLongDate(item.date)}</div>
          </div>
        ))}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
            No upcoming organization dates are scheduled yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TemplateTab({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="rounded-[24px] border border-dashed border-border bg-[radial-gradient(circle_at_top_left,rgba(14,138,149,0.14),transparent_45%)] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Template ready</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}

function ModulesTab({ data }: { data: OrganizationHubData }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Organization modules</h2>
          <p className="mt-1 text-sm text-muted-foreground">Admins can enable modules at runtime. Everyone can still see which capabilities are live, locked, or still coming soon.</p>
        </div>
        {data.userContext.canManageModules ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Admin controls enabled
          </span>
        ) : null}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {data.modules.map((moduleRow) => {
          const moduleDef = getModuleDefinition(moduleRow.key);
          if (!moduleDef) return null;
          const Icon = moduleDef.icon;
          return (
            <div key={moduleRow.key} className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-start gap-4">
                <div className={`flex size-12 items-center justify-center rounded-2xl ${moduleDef.accentClass}`}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{moduleRow.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${moduleDef.badgeClass}`}>
                      {moduleRow.enabled ? "Enabled" : "Locked"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{moduleRow.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-2.5 py-1">{moduleRow.statusLabel}</span>
                    <span className="rounded-full border border-border px-2.5 py-1">
                      {moduleRow.isWorkspace ? "Workspace-backed" : "Dashboard template"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {moduleRow.enabled && moduleRow.launchHref ? (
                      <Link href={moduleRow.launchHref} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
                        Open module
                      </Link>
                    ) : null}
                    {data.userContext.canManageModules ? (
                      <form action={toggleOrganizationModuleAction}>
                        <input type="hidden" name="organizationId" value={data.organization.id} />
                        <input type="hidden" name="moduleKey" value={moduleRow.key} />
                        <input type="hidden" name="enabled" value={String(!moduleRow.enabled)} />
                        <button type="submit" className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                          {moduleRow.enabled ? "Disable module" : "Enable module"}
                        </button>
                      </form>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="size-3.5" />
                        Admin access required to change module state
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
      />
    </div>
  );
}
