import Link from "next/link";

export function WorkspacePlaceholder({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="ds-label text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={primaryHref} className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
