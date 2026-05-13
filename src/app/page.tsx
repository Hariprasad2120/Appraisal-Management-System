import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowRight, BarChart3, Building2, CheckCircle2, Layers, ShieldCheck, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { BROWSER_SESSION_COOKIE_NAME } from "@/lib/session";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasBrowserSession = Boolean(cookieStore.get(BROWSER_SESSION_COOKIE_NAME)?.value);
  const session = await auth();
  if (session?.user && hasBrowserSession) {
    redirect("/role-redirect");
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(14,138,149,0.10),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,170,45,0.10),transparent_32%)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 md:px-6 lg:flex-row lg:items-center lg:py-24">
          <div className="max-w-3xl space-y-6">
            <p className="ds-label text-primary">Performance management SaaS</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Run appraisals, KPI reviews, and organization workflows from one secure workspace.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Monolith Engine helps multi-organization teams manage employee reviews, reviewer handoffs,
              salary decisions, KPI visibility, and operational follow-through with role-based access built in.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                Start onboarding
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/request-demo" className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted">
                Request demo
              </Link>
              <Link href="/login" className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
                Login
              </Link>
            </div>
          </div>

          <div className="grid flex-1 gap-4 md:grid-cols-2">
            <FeatureCard icon={<Building2 className="size-5" />} title="Multi-organization ready" text="Keep each organization scoped cleanly while giving shared users a clear selector flow." />
            <FeatureCard icon={<Layers className="size-5" />} title="Module-led rollout" text="Launch appraisal and KPI capabilities without forcing every customer into the same workflow." />
            <FeatureCard icon={<Users className="size-5" />} title="Role-aware dashboards" text="Support admins, HR, managers, reviewers, and employees with the views they actually need." />
            <FeatureCard icon={<ShieldCheck className="size-5" />} title="Operational guardrails" text="Protect tenant data with membership checks, module gates, and server-side route validation." />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-3 md:px-6">
        <StatCard label="Appraisal workflow" value="End-to-end" description="Self-assessment to MOM, arrears, and history." />
        <StatCard label="KPI visibility" value="Department-led" description="Monthly performance review with reviewer oversight." />
        <StatCard label="Tenant access" value="Scoped" description="Organization switching, module checks, and access-state pages." />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <InfoCard
            icon={<BarChart3 className="size-5" />}
            title="Built for internal operations teams"
            points={[
              "Track appraisal cycles, reviewer actions, management decisions, and employee outcomes.",
              "Reuse the same product across organizations without losing branch, department, and reporting context.",
              "Keep rollout practical: public landing, authenticated dashboards, and transitional redirects for legacy routes.",
            ]}
          />
          <InfoCard
            icon={<CheckCircle2 className="size-5" />}
            title="What the current rollout covers"
            points={[
              "Password-first login flow and public SaaS route surface.",
              "Organization selector and tenant-aware dashboard redirects.",
              "Platform, account, and organization entry points without breaking legacy appraisal pages.",
            ]}
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function StatCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function InfoCard({ icon, title, points }: { icon: React.ReactNode; title: string; points: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3 text-foreground">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="space-y-3">
        {points.map((point) => (
          <div key={point} className="rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
            {point}
          </div>
        ))}
      </div>
    </div>
  );
}
