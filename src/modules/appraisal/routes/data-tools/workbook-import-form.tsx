"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { importWorkbookAction } from "./actions";

export function WorkbookImportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const res = await importWorkbookAction(formData);
          if (res.ok) setMessage(res.message);
          else setError(res.error);
        });
      }}
    >
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center transition-colors hover:border-primary/60 hover:bg-primary/5">
        <Upload className="size-5 text-primary" />
        <span className="text-sm font-medium text-foreground">Choose workbook</span>
        <span className="text-xs text-muted-foreground">Upload `.xlsx` with the required sheets.</span>
        <input name="workbook" type="file" accept=".xlsx" required className="sr-only" />
      </label>
      {message && <p className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-600">{message}</p>}
      {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-xl bg-gradient-teal px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Importing..." : "Import workbook"}
      </button>
    </form>
  );
}
