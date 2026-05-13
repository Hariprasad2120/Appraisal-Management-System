import { prisma } from "@/lib/db";

export default async function PlatformPlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: [{ createdAt: "asc" }],
    include: {
      subscriptions: {
        select: { id: true, status: true },
      },
    },
  });

  const normalizedPlans = plans.map((plan) => ({
    ...plan,
    allowedModuleLabels: Array.isArray(plan.allowedModules) ? plan.allowedModules.map(String) : [],
    featureLabels: Array.isArray(plan.features) ? plan.features.map(String) : [],
  }));

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Platform plans</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Plan catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plans define organization limits, employee limits, and module entitlements at the account level.</p>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          {normalizedPlans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.priceDisplay ?? "Custom pricing"}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{formatLabel(plan.status)}</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <Row label="Max organizations" value={plan.maxOrganizations?.toString() ?? "Unlimited"} />
                <Row label="Max employees" value={plan.maxEmployees?.toString() ?? "Unlimited"} />
                <Row label="Subscriptions" value={plan.subscriptions.length.toString()} />
                <Row label="Modules" value={plan.allowedModuleLabels.join(", ") || "None"} />
              </div>
              <div className="mt-4 rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                {plan.featureLabels.length > 0 ? plan.featureLabels.join(" • ") : "No feature notes configured yet."}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2">
      <span>{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
