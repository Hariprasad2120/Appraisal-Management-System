import { prisma } from "@/lib/db";

export default async function PlatformAccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      ownerUser: { select: { name: true, email: true } },
      organizations: { select: { id: true, status: true } },
      memberships: { select: { id: true, status: true } },
      subscriptions: { orderBy: [{ createdAt: "desc" }], take: 1, include: { plan: true } },
      modules: { where: { enabled: true }, include: { module: true } },
    },
  });

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Platform accounts</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Tenant account registry</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every paying customer account now owns organizations, memberships, plan assignment, and module entitlement.</p>
        </header>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Organizations</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3 font-medium">Modules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{account.name}</div>
                    <div className="text-xs text-muted-foreground">{account.slug} • {formatLabel(account.status)}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{account.ownerUser?.email ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{account.subscriptions[0]?.plan?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{account.organizations.length}</td>
                  <td className="px-4 py-3 text-muted-foreground">{account.memberships.length}</td>
                  <td className="px-4 py-3 text-muted-foreground">{account.modules.length > 0 ? account.modules.map((moduleRow) => moduleRow.module.name).join(", ") : "Inherited/none"}</td>
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
