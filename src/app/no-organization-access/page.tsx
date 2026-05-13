import Link from "next/link";
import { Building2 } from "lucide-react";

export default function NoOrganizationAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-foreground">No organization access</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your account is active, but it does not currently have an active organization membership.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/login" className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
            Back to login
          </Link>
          <Link href="/request-demo" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
            Request access
          </Link>
        </div>
      </section>
    </main>
  );
}
