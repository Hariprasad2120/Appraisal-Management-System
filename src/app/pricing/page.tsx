import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const plans = [
  { name: "Basic", limits: "1 organization · 50 employees", modules: "Appraisal Management", tone: "For smaller teams starting structured reviews." },
  { name: "Professional", limits: "3 organizations · 300 employees", modules: "Appraisal + KPI Management", tone: "For growing operations that need cross-team visibility." },
  { name: "Enterprise", limits: "Custom organization and employee limits", modules: "All enabled modules", tone: "For larger groups that need tailored rollout and support." },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 md:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="max-w-3xl space-y-3">
          <p className="ds-label text-primary">Pricing</p>
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">Simple SaaS plan shapes for multi-organization rollout</h1>
          <p className="text-sm leading-7 text-muted-foreground md:text-base">
            Pricing is managed directly with the platform team during the current rollout. Plan limits enforce organizations, members, and enabled modules.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <Badge variant="outline">{plan.name}</Badge>
              <h2 className="mt-4 text-xl font-semibold text-foreground">{plan.limits}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{plan.modules}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.tone}</p>
            </div>
          ))}
        </section>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Need a tailored rollout, migration help, or a larger tenant structure?
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/request-demo" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
              Request demo
            </Link>
            <Link href="/register" className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
              Start onboarding
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
