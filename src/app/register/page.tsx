import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="ds-label text-primary">Start onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Invite-led registration is active in this rollout</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          New organizations are currently onboarded through the platform team so setup, migration, roles, and module enablement can be configured safely.
        </p>
        <div className="mt-6 grid gap-3 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
          <div>1. Request onboarding for your organization.</div>
          <div>2. The platform team sets up your workspace and plan limits.</div>
          <div>3. Users receive organization-specific access and can sign in with email and password.</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/request-demo" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
            Request onboarding
          </Link>
          <Link href="/login" className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
            Already have access?
          </Link>
        </div>
      </section>
    </main>
  );
}
