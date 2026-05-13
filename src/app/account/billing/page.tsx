import Link from "next/link";
import { auth } from "@/lib/auth";
import { canManageAccount, getAccountUsage, requireActiveAccount } from "@/lib/tenant";

export default async function AccountBillingPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const account = await requireActiveAccount(session.user);
  if (!(await canManageAccount(session.user, account.id))) {
    return null;
  }

  const usage = await getAccountUsage(account.id);
  const subscription = usage.subscription;
  const plan = subscription?.plan ?? null;

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Billing and subscription</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{account.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Billing remains admin-managed in v1, but plan entitlement, limits, and subscription status are now visible here.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Panel title="Subscription">
            <Line label="Plan" value={plan?.name ?? "Not assigned"} />
            <Line label="Subscription status" value={formatLabel(subscription?.status ?? "PENDING")} />
            <Line label="Started" value={subscription?.startedAt ? subscription.startedAt.toLocaleDateString("en-IN") : "Not started"} />
            <Line label="Ends" value={subscription?.endsAt ? subscription.endsAt.toLocaleDateString("en-IN") : "Renewal TBD"} />
          </Panel>

          <Panel title="Plan limits">
            <Line label="Organizations allowed" value={plan?.maxOrganizations?.toString() ?? "Custom"} />
            <Line label="Employees allowed" value={plan?.maxEmployees?.toString() ?? "Custom"} />
            <Line label="Organizations used" value={usage.organizationCount.toString()} />
            <Line label="Employees used" value={usage.activeEmployeeCount.toString()} />
          </Panel>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Current billing posture</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Live checkout is intentionally deferred. Plan assignment, renewals, suspensions, and module entitlement changes should currently be handled by the platform super admin from the platform workspace.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/pricing" className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
              View public pricing
            </Link>
            <Link href="/account/dashboard" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
              Back to account dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 space-y-3 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
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
