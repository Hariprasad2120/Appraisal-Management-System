import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = [
  "Code of Conduct",
  "Leave Policy",
  "IT Policy",
  "Safety",
  "Compensation",
  "Recruitment",
  "Other",
] as const;

type PolicyDefaults = {
  title?: string;
  category?: string;
  body?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  effectiveFrom?: Date | string | null;
};

function iso(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function PolicyForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaults: PolicyDefaults;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required className="mt-1" defaultValue={defaults.title ?? ""} />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue={defaults.category ?? CATEGORIES[0]}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={defaults.status ?? "DRAFT"}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <div>
        <Label htmlFor="effectiveFrom">Effective From</Label>
        <Input
          id="effectiveFrom"
          name="effectiveFrom"
          type="date"
          className="mt-1"
          defaultValue={iso(defaults.effectiveFrom)}
        />
      </div>
      <div>
        <Label htmlFor="body">Policy Body (Markdown)</Label>
        <Textarea
          id="body"
          name="body"
          rows={14}
          required
          className="mt-1 font-mono text-xs"
          defaultValue={defaults.body ?? ""}
        />
      </div>
      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
