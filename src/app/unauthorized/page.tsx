import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
          <ShieldAlert className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Unauthorized</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your account is signed in, but this route is not available for your current organization role.
        </p>
        <Link href="/role-redirect" className="mt-5 inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
          Back to workspace
        </Link>
      </section>
    </main>
  );
}
