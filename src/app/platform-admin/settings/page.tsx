import { prisma } from "@/lib/db";

export default async function PlatformSettingsPage() {
  const [platformAdmins, activeInvites] = await Promise.all([
    prisma.user.findMany({
      where: { platformRole: "PLATFORM_SUPER_ADMIN" },
      select: { id: true, name: true, email: true, status: true },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.invite.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="ds-label text-primary">Platform settings</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Platform controls and support posture</h1>
          <p className="mt-1 text-sm text-muted-foreground">This page surfaces the key platform-level ownership and support controls that now sit above any individual tenant account.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Platform super admins</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {platformAdmins.map((admin) => (
                <div key={admin.id} className="rounded-lg border border-border bg-background px-3 py-2">
                  <div className="font-medium text-foreground">{admin.name}</div>
                  <div>{admin.email}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Operational notes</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border bg-background px-3 py-2">Pending invites across the platform: <span className="font-medium text-foreground">{activeInvites}</span></div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">Account suspension, billing state, and tenant support tooling should be controlled from platform-admin routes only.</div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">Customer admins must never be promoted implicitly from organization roles.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
