import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Layers, ShieldCheck, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getPlatformOrganizations, resolvePlatformHome } from "@/lib/platform-setup";
import {
  createOrganizationAction,
  setAppraisalModuleEnabledAction,
  updateOrganizationStatusAction,
} from "./actions";

export default async function PlatformSuperAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.platformRole !== "PLATFORM_SUPER_ADMIN") redirect("/");

  const [organizations, platformState] = await Promise.all([
    getPlatformOrganizations(),
    resolvePlatformHome(session.user),
  ]);

  const activeOrgs = organizations.filter((org) => org.status === "ACTIVE").length;
  const enabledAppraisal = organizations.filter((org) =>
    org.modules.some((item) => item.module.key === "appraisal-management" && item.enabled),
  ).length;

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="ds-label text-primary">Platform Level</p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">Performance Management Platform</h1>
            <p className="mt-1 text-sm text-muted-foreground">Organization management, access status, and module controls.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={platformState.homePath} className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted">
              Open current workspace
            </Link>
            <Link href="/platform/setup" className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted">
              Continue setup
            </Link>
            <div className="grid grid-cols-3 gap-3 text-center">
            <Stat icon={<Building2 className="size-4" />} label="Organizations" value={organizations.length} />
            <Stat icon={<ShieldCheck className="size-4" />} label="Active" value={activeOrgs} />
            <Stat icon={<Layers className="size-4" />} label="Appraisal" value={enabledAppraisal} />
            </div>
          </div>
        </header>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Create Organization</h2>
          <form action={createOrganizationAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
            <input name="name" required placeholder="Organization name" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <input name="slug" required placeholder="org-slug" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <input name="industry" placeholder="Industry" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <Button type="submit">Create</Button>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="size-4 text-primary" />
              Registered Organizations
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 font-medium">Status</th>
                  <th className="px-4 font-medium">Access</th>
                  <th className="px-4 font-medium">Structure</th>
                  <th className="px-4 font-medium">Appraisal Module</th>
                  <th className="px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((org) => {
                  const appraisal = org.modules.find((item) => item.module.key === "appraisal-management");
                  return (
                    <tr key={org.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-foreground">{org.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">/{org.slug}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs font-medium">
                          {org.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {org.access?.status ?? "TRIAL"}
                        {org.access?.planName ? ` - ${org.access.planName}` : ""}
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {org._count.memberships} users, {org._count.branches} branches, {org._count.departments} departments
                      </td>
                      <td className="px-4 py-4">
                        <form action={setAppraisalModuleEnabledAction}>
                          <input type="hidden" name="organizationId" value={org.id} />
                          <input type="hidden" name="enabled" value={appraisal?.enabled ? "false" : "true"} />
                          <Button type="submit" variant={appraisal?.enabled ? "outline" : "default"} size="sm">
                            {appraisal?.enabled ? "Disable" : "Enable"}
                          </Button>
                        </form>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {(["ACTIVE", "SUSPENDED"] as const).map((status) => (
                            <form key={status} action={updateOrganizationStatusAction}>
                              <input type="hidden" name="organizationId" value={org.id} />
                              <input type="hidden" name="status" value={status} />
                              <Button type="submit" variant="outline" size="sm">
                                {status === "ACTIVE" ? "Activate" : "Suspend"}
                              </Button>
                            </form>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="mx-auto mb-1 flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
