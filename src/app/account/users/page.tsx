import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageAccount, requireActiveAccount } from "@/lib/tenant";

export default async function AccountUsersPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const activeAccount = await requireActiveAccount(session.user);
  if (!(await canManageAccount(session.user, activeAccount.id))) {
    return null;
  }

  const account = await prisma.account.findUniqueOrThrow({
    where: { id: activeAccount.id },
    include: {
      memberships: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          invitedBy: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  const memberships = account.memberships;

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Account users</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Account memberships</h1>
          <p className="mt-1 text-sm text-muted-foreground">Account-level roles are separate from organization memberships and control tenant-owner access to shared settings and limits.</p>
        </header>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Invited by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {memberships.map((membership) => (
                <tr key={membership.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{membership.user.name}</div>
                    <div className="text-xs text-muted-foreground">{membership.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatLabel(membership.role)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatLabel(membership.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{membership.invitedBy?.name ?? "System"}</td>
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
