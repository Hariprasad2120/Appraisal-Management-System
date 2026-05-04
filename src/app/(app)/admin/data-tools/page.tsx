import Link from "next/link";

export default function AdminDataToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="ds-h1">Data Tools</h1>
        <p className="ds-body mt-1">Reset and fresh import preparation tools for production data onboarding.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Safe database reset</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The reset script deletes appraisal data and all non-admin users while preserving or recreating
          <span className="font-medium text-foreground"> hr@adarshshipping.in</span>.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`$env:CONFIRM_RESET="KEEP_ONLY_ADMIN"
$env:RESET_ADMIN_PASSWORD="set-a-strong-temporary-password"
npm run db:reset:keep-admin`}
        </pre>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Fresh import workbook</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Prepare the company workbook with the required sheets and columns before importing fresh data.
        </p>
        <Link href="/fresh-data-import-format.md" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
          Open spreadsheet format
        </Link>
      </section>
    </div>
  );
}
