import { prisma } from "@/lib/db";

export default async function PlatformModulesPage() {
  const modules = await prisma.module.findMany({
    orderBy: [{ name: "asc" }],
    include: {
      organizations: {
        where: { enabled: true },
        select: { id: true },
      },
      accountModules: {
        where: { enabled: true },
        select: { id: true },
      },
    },
  });

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Platform modules</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Module management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Modules can now be granted at the account level and enabled at the organization level underneath that entitlement.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {modules.map((moduleItem) => (
            <div key={moduleItem.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{moduleItem.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{moduleItem.key}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{moduleItem.active ? "Active" : "Disabled"}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{moduleItem.description ?? "No description configured."}</p>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                <Row label="Accounts entitled" value={moduleItem.accountModules.length.toString()} />
                <Row label="Organizations enabled" value={moduleItem.organizations.length.toString()} />
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
