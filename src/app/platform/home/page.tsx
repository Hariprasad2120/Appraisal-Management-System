import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Layers, Lock, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlatformOrganizations, resolvePlatformHome, PLATFORM_MODULE_DEFINITIONS } from "@/lib/platform-setup";

type SearchParams = Promise<{ success?: string }>;

export default async function PlatformHomePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.platformRole !== "PLATFORM_SUPER_ADMIN") redirect("/");

  const [{ success }, platformState, organizations] = await Promise.all([
    searchParams,
    resolvePlatformHome(session.user),
    getPlatformOrganizations(),
  ]);

  if (platformState.needsSetup) {
    redirect("/platform/setup");
  }

  const organization = platformState.organization;
  if (!organization) {
    redirect("/platform/setup");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ds-label text-primary">Active organization</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">{organization.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a module, manage tenant setup, and control access from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{organization.status}</Badge>
            <Badge variant="outline">{organization.slug}</Badge>
          </div>
        </div>
        {success ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300">
            {decodeURIComponent(success)}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Organizations" value={organizations.length} icon={<Building2 className="size-4" />} />
        <StatCard label="Members" value={platformState.memberships.length} icon={<Users className="size-4" />} />
        <StatCard label="Enabled modules" value={organization.modules.filter((item) => item.enabled).length} icon={<Layers className="size-4" />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Module launcher</CardTitle>
            <CardDescription>Appraisal is live now. HRMS Attendance and CRM are ready to be activated later.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {PLATFORM_MODULE_DEFINITIONS.map((moduleDef) => {
              const orgModule = organization.modules.find((item) => item.module.key === moduleDef.key);
              const enabled = orgModule?.enabled ?? false;
              const launchable = enabled;
              return (
                <div key={moduleDef.key} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{moduleDef.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{moduleDef.description}</p>
                    </div>
                    {launchable ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Live</Badge>
                    ) : enabled ? (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Queued</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {launchable ? "Enabled" : "Not enabled"}
                    </div>
                    {launchable ? (
                      <Link href="/admin" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/85">
                        Open
                        <ArrowRight className="size-4" />
                      </Link>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                        <Lock className="size-3.5" />
                        Enable in setup
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup status</CardTitle>
            <CardDescription>Current onboarding completion for the active organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {platformState.steps.map((step) => (
              <div key={step.key} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <span className="text-sm text-foreground">{step.label}</span>
                {step.complete ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="size-3.5" />
                    Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-3.5" />
                    Needs attention
                  </span>
                )}
              </div>
            ))}
            <Link href="/platform/setup" className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground transition hover:bg-muted">
              Review setup
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
