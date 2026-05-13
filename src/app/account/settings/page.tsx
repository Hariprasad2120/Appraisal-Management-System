import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageAccount, requireActiveAccount } from "@/lib/tenant";

export default async function AccountSettingsPage() {
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
      ownerUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Account settings</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{account.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tenant identity, ownership, and account-scoped defaults now live independently from organization setup.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Account identity</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <Row label="Account name" value={account.name} />
              <Row label="Slug" value={account.slug} />
              <Row label="Status" value={formatLabel(account.status)} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Ownership</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <Row label="Owner" value={account.ownerUser?.name ?? "Unassigned"} />
              <Row label="Owner email" value={account.ownerUser?.email ?? "Unassigned"} />
              <Row label="Your role" value={formatLabel(session.user.accountRole ?? "ACCOUNT_MEMBER")} />
            </div>
          </div>
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
