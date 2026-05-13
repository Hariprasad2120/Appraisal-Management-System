import Link from "next/link";

export default function RequestDemoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="ds-label text-primary">Request demo</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Book a guided rollout conversation</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          The current release supports guided onboarding for new customers. Reach out with your organization details and the platform team can enable the right modules and limits.
        </p>
        <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
          Preferred contact: <span className="font-medium text-foreground">hariprasad.official.137@gmail.com</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="mailto:hariprasad.official.137@gmail.com?subject=Monolith%20Engine%20Demo%20Request" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
            Email the platform team
          </Link>
          <Link href="/pricing" className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
            Review plan shapes
          </Link>
        </div>
      </section>
    </main>
  );
}
