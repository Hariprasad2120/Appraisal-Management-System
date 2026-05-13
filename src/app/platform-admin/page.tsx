import Link from "next/link";
import { Building2, CreditCard, Layers3, ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function PlatformAdminPage() {
  const [accountCount, organizationCount, userCount, employeeCount, activeSubscriptionCount, moduleCount, suspendedAccounts, recentAccounts] = await Promise.all([
    prisma.account.count(),
    prisma.organization.count(),
    prisma.user.count(),
    prisma.organizationUser.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.module.count({ where: { active: true } }),
    prisma.account.count({ where: { status: "SUSPENDED" } }),
    prisma.account.findMany({
      take: 5,
      orderBy: [{ createdAt: "desc" }],
      include: {
        ownerUser: { select: { name: true, email: true } },
        organizations: { select: { id: true } },
        subscriptions: { orderBy: [{ createdAt: "desc" }], take: 1, include: { plan: true } },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Platform admin</p>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">SaaS platform command center</h1>
              <p className="mt-1 text-sm text-muted-foreground">This workspace owns tenant accounts, plan assignment, module entitlements, and platform-level oversight.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/platform-admin/accounts" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                Manage accounts
              </Link>
              <Link href="/platform-admin/subscriptions" className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
                Review subscriptions
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Stat icon={<Building2 className="size-4" />} label="Accounts" value={accountCount.toString()} />
          <Stat icon={<Layers3 className="size-4" />} label="Organizations" value={organizationCount.toString()} />
          <Stat icon={<Users className="size-4" />} label="Users" value={userCount.toString()} />
          <Stat icon={<Users className="size-4" />} label="Active members" value={employeeCount.toString()} />
          <Stat icon={<CreditCard className="size-4" />} label="Active subscriptions" value={activeSubscriptionCount.toString()} />
          <Stat icon={<ShieldCheck className="size-4" />} label="Active modules" value={moduleCount.toString()} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr,0.9fr]">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Recent tenant accounts</h2>
                <p className="mt-1 text-sm text-muted-foreground">Platform ownership, plan state, and organization footprint at a glance.</p>
              </div>
              <Link href="/platform-admin/accounts" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Organizations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {recentAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{account.name}</div>
                        <div className="text-xs text-muted-foreground">{formatLabel(account.status)}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{account.ownerUser?.email ?? "Unassigned"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{account.subscriptions[0]?.plan?.name ?? "Unassigned"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{account.organizations.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Platform alerts</h2>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                <div className="rounded-xl border border-border bg-background px-4 py-3">Suspended accounts: <span className="font-medium text-foreground">{suspendedAccounts}</span></div>
                <div className="rounded-xl border border-border bg-background px-4 py-3">Public pricing is informational only. Plan assignment remains platform-admin controlled.</div>
                <div className="rounded-xl border border-border bg-background px-4 py-3">Organization routes now sit under tenant ownership instead of standalone organization access.</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Platform navigation</h2>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                <Link href="/platform-admin/organizations" className="rounded-xl border border-border bg-background px-4 py-3 transition hover:bg-muted">
                  Review organizations across all tenants.
                </Link>
                <Link href="/platform-admin/plans" className="rounded-xl border border-border bg-background px-4 py-3 transition hover:bg-muted">
                  Maintain plan catalog and limit settings.
                </Link>
                <Link href="/platform-admin/modules" className="rounded-xl border border-border bg-background px-4 py-3 transition hover:bg-muted">
                  Manage platform modules and account entitlements.
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="text-xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
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
