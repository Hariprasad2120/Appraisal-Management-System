import Link from "next/link";

export function OrgWorkspaceShell({
  eyebrow,
  title,
  description,
  organizationName,
  organizationId,
  roleLabels,
  primaryHref,
  primaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  organizationName: string;
  organizationId: string;
  roleLabels: string[];
  primaryHref: string;
  primaryLabel: string;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{organizationName}</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Tile label="Organization" value={organizationName} />
          <Tile label="Organization ID" value={organizationId} />
          <Tile label="Your roles" value={roleLabels.join(", ")} />
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Transition workspace</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            This route is now a real organization-scoped entry point. Until every screen is migrated under `/org/[orgId]/*`, the existing business workflow remains reachable through the legacy dashboard links below.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={primaryHref} className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
              {primaryLabel}
            </Link>
            <Link href={`/org/${organizationId}`} className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
              Re-evaluate organization home
            </Link>
            <Link href="/account/organizations" className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
              Switch organization
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
