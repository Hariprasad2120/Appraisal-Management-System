import { prisma } from "@/lib/db";

export default async function PlatformSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      account: { select: { name: true, slug: true, status: true } },
      plan: { select: { name: true, priceDisplay: true, maxOrganizations: true, maxEmployees: true } },
    },
  });

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Platform subscriptions</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Subscription controls</h1>
          <p className="mt-1 text-sm text-muted-foreground">Subscriptions are account-scoped and drive plan limits across all organizations within the tenant.</p>
        </header>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Ends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{subscription.account.name}</div>
                    <div className="text-xs text-muted-foreground">{subscription.account.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{subscription.plan.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatLabel(subscription.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{subscription.startedAt ? subscription.startedAt.toLocaleDateString("en-IN") : "Not started"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{subscription.endsAt ? subscription.endsAt.toLocaleDateString("en-IN") : "Open-ended"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
