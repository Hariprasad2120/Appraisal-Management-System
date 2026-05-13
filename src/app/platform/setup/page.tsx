import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CheckCircle2, Layers, ShieldCheck, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  assignDepartmentRoleAction,
  createStandaloneManagementUserAction,
  deleteBranchAction,
  deleteDepartmentAction,
  deleteEmployeeAction,
  finalizeModulesAction,
  removeDepartmentRoleAssignmentAction,
  saveBranchAction,
  saveDepartmentAction,
  saveEmployeeAction,
  saveOrganizationAction,
} from "./actions";
import { PLATFORM_MODULE_DEFINITIONS, getPlatformSetupSnapshot } from "@/lib/platform-setup";

type SearchParams = Promise<{ error?: string; success?: string }>;

export default async function PlatformSetupPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.platformRole !== "PLATFORM_SUPER_ADMIN") redirect("/");

  const [{ error, success }, snapshot] = await Promise.all([
    searchParams,
    getPlatformSetupSnapshot(session.user),
  ]);

  const organization = snapshot.organization;
  const departments = organization?.departments ?? [];
  const branches = organization?.branches ?? [];
  const members = snapshot.memberships;
  const assignmentUsers = members.map((membership) => membership.user);
  const branchReady = branches.length > 0;
  const departmentReady = departments.length > 0;
  const ownershipReady = branchReady && departmentReady;
  const employeesReady = ownershipReady;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ds-label text-primary">Mandatory onboarding</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">
              {organization ? `Set up ${organization.name}` : "Create your first organization"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish the organization, structure, users, hierarchy, and module selection before entering the product.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {snapshot.steps.map((step) => (
              <Badge key={step.key} variant={step.complete ? "default" : "outline"}>
                {step.label}
              </Badge>
            ))}
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            {decodeURIComponent(error)}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300">
            {decodeURIComponent(success)}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SetupStat icon={<Building2 className="size-4" />} label="Branches" value={branches.length} />
        <SetupStat icon={<ShieldCheck className="size-4" />} label="Assignments" value={snapshot.assignments.length} />
        <SetupStat icon={<Users className="size-4" />} label="Members" value={members.length} />
      </section>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Organization details</CardTitle>
            <CardDescription>Create the tenant profile and set the default locale, timezone, and contact details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveOrganizationAction} className="grid gap-3 md:grid-cols-2" encType="multipart/form-data">
              <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
              <Field label="Organization name" name="name" defaultValue={organization?.name ?? ""} required />
              <Field label="Slug" name="slug" defaultValue={organization?.slug ?? ""} required />
              <Field label="Legal name" name="legalName" defaultValue={organization?.legalName ?? ""} />
              <Field label="Industry" name="industry" defaultValue={organization?.industry ?? ""} />
              <Field label="Contact email" name="contactEmail" type="email" defaultValue={organization?.contactEmail ?? ""} />
              <Field label="Contact phone" name="contactPhone" defaultValue={organization?.contactPhone ?? ""} />
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
                <textarea name="address" defaultValue={organization?.address ?? ""} className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <Field label="Timezone" name="timezone" defaultValue={organization?.settings?.timezone ?? "Asia/Kolkata"} required />
              <Field label="Locale" name="locale" defaultValue={organization?.settings?.locale ?? "en-IN"} required />
              <Field label="Date format" name="dateFormat" defaultValue={organization?.settings?.dateFormat ?? "dd/MM/yyyy"} required />
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Organization logo</label>
                <input
                  type="file"
                  name="logo"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Recommended during setup. You can skip this for now and upload a logo later from the organization overview.
                </p>
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Save organization</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Branches</CardTitle>
            <CardDescription>Add at least one branch before departments can be finalized.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={saveBranchAction} className="grid gap-3 md:grid-cols-3">
              <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
              <Field label="Branch name" name="name" required disabled={!organization} />
              <Field label="Code" name="code" disabled={!organization} />
              <Field label="City" name="city" disabled={!organization} />
              <Field label="State" name="state" disabled={!organization} />
              <Field label="Country" name="country" disabled={!organization} />
              <Field label="Address" name="address" disabled={!organization} />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="active" defaultChecked disabled={!organization} />
                Active branch
              </label>
              <div className="md:col-span-3">
                <Button type="submit" disabled={!organization}>Add branch</Button>
              </div>
            </form>
            <div className="grid gap-3">
              {branches.length === 0 ? <EmptyState text="No branches added yet." /> : branches.map((branch) => (
                <div key={branch.id} className="rounded-xl border border-border bg-background p-4">
                  <form action={saveBranchAction} className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
                    <input type="hidden" name="id" value={branch.id} />
                    <Field label="Branch name" name="name" defaultValue={branch.name} required />
                    <Field label="Code" name="code" defaultValue={branch.code ?? ""} />
                    <Field label="City" name="city" defaultValue={branch.city ?? ""} />
                    <div className="flex items-end gap-2">
                      <Button type="submit" variant="outline" size="sm">Update</Button>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" name="active" defaultChecked={branch.active} />
                        Active
                      </label>
                    </div>
                    <div className="md:col-span-3 text-xs text-muted-foreground">
                      {[branch.address, branch.state, branch.country].filter(Boolean).join(" · ") || "No extra location details yet"}
                    </div>
                  </form>
                  <form action={deleteBranchAction} className="mt-3">
                    <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
                    <input type="hidden" name="branchId" value={branch.id} />
                    <Button type="submit" variant="outline" size="sm">Remove</Button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={!branchReady ? "opacity-75" : ""}>
          <CardHeader>
            <CardTitle>3. Departments</CardTitle>
            <CardDescription>Create departments and connect them to a branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!branchReady ? <BlockedNotice text="Add at least one branch before creating departments." /> : null}
            <form action={saveDepartmentAction} className="grid gap-3 md:grid-cols-3">
              <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
              <Field label="Department name" name="name" required disabled={!branchReady} />
              <Field label="Code" name="code" disabled={!branchReady} />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Branch</label>
                <select name="branchId" defaultValue="" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" disabled={!branchReady}>
                  <option value="">Choose branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="active" defaultChecked disabled={!branchReady} />
                Active department
              </label>
              <div className="md:col-span-3">
                <Button type="submit" disabled={!branchReady}>Add department</Button>
              </div>
            </form>
            <div className="grid gap-3">
              {departments.length === 0 ? <EmptyState text="No departments added yet." /> : departments.map((department) => (
                <div key={department.id} className="rounded-xl border border-border bg-background p-4">
                  <form action={saveDepartmentAction} className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
                    <input type="hidden" name="id" value={department.id} />
                    <Field label="Department name" name="name" defaultValue={department.name} required />
                    <Field label="Code" name="code" defaultValue={department.code ?? ""} />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Branch</label>
                      <select name="branchId" defaultValue={department.branchId ?? ""} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                        <option value="">Choose branch</option>
                        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Button type="submit" variant="outline" size="sm">Update</Button>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" name="active" defaultChecked={department.active} />
                        Active
                      </label>
                    </div>
                  </form>
                  <div className="mt-2 text-xs text-muted-foreground">{department.branch?.name ?? "No branch linked"}</div>
                  <form action={deleteDepartmentAction} className="mt-3">
                    <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
                    <input type="hidden" name="departmentId" value={department.id} />
                    <Button type="submit" variant="outline" size="sm">Remove</Button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={!ownershipReady ? "opacity-75" : ""}>
          <CardHeader>
            <CardTitle>4. Department ownership and management users</CardTitle>
            <CardDescription>Create standalone management users or assign existing members to HR, manager, TL, management, or appraisal admin roles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!ownershipReady ? <BlockedNotice text="Add branches and departments first." /> : null}
            <div className="grid gap-6 lg:grid-cols-2">
              <form action={createStandaloneManagementUserAction} className="rounded-xl border border-border bg-background p-4">
                <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
                <h3 className="text-sm font-semibold text-foreground">Create standalone management user</h3>
                <div className="mt-4 grid gap-3">
                  <Field label="Name" name="name" required disabled={!ownershipReady} />
                  <Field label="Email" name="email" type="email" required disabled={!ownershipReady} />
                  <SelectField label="Branch" name="branchId" options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} disabled={!ownershipReady} />
                  <SelectField label="Department" name="departmentId" options={departments.map((department) => ({ value: department.id, label: department.name }))} disabled={!ownershipReady} />
                  <SelectField label="Role" name="role" options={[
                    { value: "MANAGEMENT", label: "Management" },
                    { value: "HR", label: "HR" },
                    { value: "MANAGER", label: "Manager" },
                    { value: "TEAM_LEAD", label: "Team lead" },
                    { value: "APPRAISAL_ADMIN", label: "Appraisal admin" },
                  ]} disabled={!ownershipReady} />
                  <Button type="submit" disabled={!ownershipReady}>Create management user</Button>
                </div>
              </form>

              <form action={assignDepartmentRoleAction} className="rounded-xl border border-border bg-background p-4">
                <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
                <h3 className="text-sm font-semibold text-foreground">Assign department role</h3>
                <div className="mt-4 grid gap-3">
                  <SelectField label="User" name="userId" options={assignmentUsers.map((member) => ({ value: member.id, label: `${member.name} (${member.email})` }))} disabled={!ownershipReady} />
                  <SelectField label="Branch" name="branchId" options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} disabled={!ownershipReady} />
                  <SelectField label="Department" name="departmentId" options={departments.map((department) => ({ value: department.id, label: department.name }))} disabled={!ownershipReady} />
                  <SelectField label="Role" name="role" options={[
                    { value: "MANAGEMENT", label: "Management" },
                    { value: "HR", label: "HR" },
                    { value: "MANAGER", label: "Manager" },
                    { value: "TEAM_LEAD", label: "Team lead" },
                    { value: "APPRAISAL_ADMIN", label: "Appraisal admin" },
                  ]} disabled={!ownershipReady} />
                  <Button type="submit" disabled={!ownershipReady}>Assign role</Button>
                </div>
              </form>
            </div>

            <div className="grid gap-3">
              {snapshot.assignments.length === 0 ? <EmptyState text="No departmental ownership or management assignments yet." /> : snapshot.assignments.map((assignment) => (
                <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                  <div>
                    <div className="font-medium text-foreground">{assignment.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {assignment.role.replaceAll("_", " ")}
                      {assignment.departmentId ? ` · ${departments.find((department) => department.id === assignment.departmentId)?.name ?? "Department"}` : ""}
                    </div>
                  </div>
                  <form action={removeDepartmentRoleAssignmentAction}>
                    <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <Button type="submit" variant="outline" size="sm">Remove</Button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={!employeesReady ? "opacity-75" : ""}>
          <CardHeader>
            <CardTitle>5. Employees and reporting hierarchy</CardTitle>
            <CardDescription>Add employees, assign branch and department membership, and connect TL, manager, and management reporting lines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!employeesReady ? <BlockedNotice text="Add branches and departments before creating employees." /> : null}
            <form action={saveEmployeeAction} className="grid gap-3 md:grid-cols-3">
              <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
              <Field label="Full name" name="name" required disabled={!employeesReady} />
              <Field label="Email" name="email" type="email" required disabled={!employeesReady} />
              <Field label="Designation" name="designation" disabled={!employeesReady} />
              <Field label="Employee #" name="employeeNumber" type="number" disabled={!employeesReady} />
              <Field label="Joining date" name="joiningDate" type="date" required disabled={!employeesReady} />
              <SelectField label="Branch" name="branchId" options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} disabled={!employeesReady} />
              <SelectField label="Department" name="departmentId" options={departments.map((department) => ({ value: department.id, label: department.name }))} disabled={!employeesReady} />
              <SelectField label="Primary role" name="primaryRole" options={[
                { value: "EMPLOYEE", label: "Employee" },
                { value: "HR", label: "HR" },
                { value: "MANAGER", label: "Manager" },
                { value: "TL", label: "Team lead" },
                { value: "MANAGEMENT", label: "Management" },
                { value: "ADMIN", label: "Admin" },
              ]} disabled={!employeesReady} />
              <SelectField label="Secondary role" name="secondaryRole" options={[
                { value: "", label: "None" },
                { value: "HR", label: "HR" },
                { value: "MANAGER", label: "Manager" },
                { value: "TL", label: "Team lead" },
                { value: "MANAGEMENT", label: "Management" },
                { value: "ADMIN", label: "Admin" },
              ]} disabled={!employeesReady} />
              <SelectField label="Reports to TL" name="teamLeadId" options={[{ value: "", label: "None" }, ...assignmentUsers.map((member) => ({ value: member.id, label: member.name }))]} disabled={!employeesReady} />
              <SelectField label="Reports to manager" name="managerId" options={[{ value: "", label: "None" }, ...assignmentUsers.map((member) => ({ value: member.id, label: member.name }))]} disabled={!employeesReady} />
              <SelectField label="Reports to management" name="managementId" options={[{ value: "", label: "None" }, ...assignmentUsers.map((member) => ({ value: member.id, label: member.name }))]} disabled={!employeesReady} />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="active" defaultChecked disabled={!employeesReady} />
                Active employee
              </label>
              <div className="md:col-span-3">
                <Button type="submit" disabled={!employeesReady}>Save employee</Button>
              </div>
            </form>
            <div className="grid gap-3">
              {members.length === 0 ? <EmptyState text="No members in this organization yet." /> : members.map((membership) => (
                <div key={membership.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                  <div>
                    <div className="font-medium text-foreground">{membership.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {membership.branch?.name ?? "No branch"} · {membership.department?.name ?? "No department"} · {membership.user.role}
                    </div>
                  </div>
                  {membership.user.platformRole === "PLATFORM_SUPER_ADMIN" ? (
                    <Badge variant="outline">Platform owner</Badge>
                  ) : (
                    <form action={deleteEmployeeAction}>
                      <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
                      <input type="hidden" name="userId" value={membership.user.id} />
                      <Button type="submit" variant="outline" size="sm">Remove</Button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={!snapshot.steps.find((step) => step.key === "employees")?.complete ? "opacity-75" : ""}>
          <CardHeader>
            <CardTitle>6. Module selection</CardTitle>
            <CardDescription>Choose the module access for this organization. Modules can be adjusted later from the organization hub by tenant admins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={finalizeModulesAction} className="space-y-4">
              <input type="hidden" name="organizationId" value={organization?.id ?? ""} />
              <div className="grid gap-3 md:grid-cols-3">
                {PLATFORM_MODULE_DEFINITIONS.map((moduleDef) => {
                  const existing = organization?.modules.find((moduleItem) => moduleItem.module.key === moduleDef.key);
                  const enabled = existing?.enabled ?? false;
                  return (
                    <label key={moduleDef.key} className="cursor-pointer rounded-xl border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-foreground">{moduleDef.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{moduleDef.description}</div>
                        </div>
                        <input type="checkbox" name="selectedModules" value={moduleDef.key} defaultChecked={enabled} className="mt-1" />
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="text-sm text-foreground">
                  Completing this step activates the organization and sends you to the module launcher.
                </div>
                <Button type="submit" disabled={!organization}>
                  Complete setup
                  <CheckCircle2 className="size-4" />
                </Button>
              </div>
            </form>
            {snapshot.currentStep === "complete" ? (
              <Link href="/platform/home" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground transition hover:bg-muted">
                Open module launcher
                <Layers className="size-4" />
              </Link>
            ) : null}
          </CardContent>
        </Card>
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
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  disabled,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <select name={name} defaultValue={options[0]?.value ?? ""} disabled={disabled} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
        {options.map((option) => (
          <option key={`${name}-${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SetupStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function BlockedNotice({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
      {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">{text}</div>;
}
