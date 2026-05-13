import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function PlatformOrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      account: { select: { name: true, slug: true, status: true } },
      _count: { select: { memberships: true, branches: true, departments: true } },
    },
  });

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Platform organizations</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Cross-tenant organization oversight</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organizations are no longer standalone customers. Each organization is mapped to a parent tenant account.</p>
        </header>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3 font-medium">Structure</th>
                <th className="px-4 py-3 font-medium">Workspace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {organizations.map((organization) => (
                <tr key={organization.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{organization.name}</div>
                    <div className="text-xs text-muted-foreground">{organization.slug} • {formatLabel(organization.status)}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {organization.account.name}
                    <div className="text-xs">{organization.account.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{organization._count.memberships}</td>
                  <td className="px-4 py-3 text-muted-foreground">{organization._count.branches} branches • {organization._count.departments} departments</td>
                  <td className="px-4 py-3">
                    <Link href={`/org/${organization.id}`} className="text-primary hover:underline">
                      Open workspace
                    </Link>
                  </td>
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
