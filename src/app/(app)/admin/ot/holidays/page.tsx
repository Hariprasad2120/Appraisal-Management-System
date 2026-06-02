"use client";

import { useState, useEffect, useCallback } from "react";
import { FadeIn } from "@/components/motion-div";
import { Calendar, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OtWorkbookImporter } from "@/components/ot-workbook-importer";

const HOLIDAY_TYPES = ["NATIONAL", "COMPANY", "RESTRICTED", "WEEKEND"] as const;
type HolidayType = (typeof HOLIDAY_TYPES)[number];

const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  NATIONAL: "National",
  COMPANY: "Company",
  RESTRICTED: "Restricted",
  WEEKEND: "Weekend",
};

const HOLIDAY_TYPE_COLORS: Record<HolidayType, string> = {
  NATIONAL: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  COMPANY: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  RESTRICTED: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  WEEKEND: "bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400",
};

interface Holiday {
  id: string;
  holidayDate: string;
  holidayName: string;
  holidayType: HolidayType;
}

export default function HolidaysPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    holidayDate: "",
    holidayName: "",
    holidayType: "NATIONAL" as HolidayType,
  });
  const [adding, setAdding] = useState(false);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/ot/holidays?year=${year}`);
      const data = await r.json();
      setHolidays(data);
    } finally {
      setLoading(false);
    }
  }, [year]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.holidayDate || !form.holidayName) return;
    setAdding(true);
    try {
      const res = await fetch("/api/ot/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add");
      }
      toast.success("Holiday added");
      setForm({ holidayDate: "", holidayName: "", holidayType: "NATIONAL" });
      fetchHolidays();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add holiday");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/ot/holidays/${id}`, { method: "DELETE" });
      toast.success("Holiday removed");
      setHolidays((h) => h.filter((x) => x.id !== id));
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
              <Calendar className="size-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="ds-h1">Holiday Manager</h1>
              <p className="ds-body mt-0.5">Manage the company holiday calendar</p>
            </div>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </FadeIn>

      {/* Add form */}
      <FadeIn delay={0.1}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="size-4" /> Add Holiday
            </span>
          </div>
          <form onSubmit={handleAdd} className="p-5">
            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <label className="ds-label">Date</label>
                <input
                  type="date"
                  required
                  value={form.holidayDate}
                  onChange={(e) => setForm((f) => ({ ...f, holidayDate: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="ds-label">Holiday Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali"
                  value={form.holidayName}
                  onChange={(e) => setForm((f) => ({ ...f, holidayName: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="ds-label">Type</label>
                <div className="flex gap-2">
                  <select
                    value={form.holidayType}
                    onChange={(e) => setForm((f) => ({ ...f, holidayType: e.target.value as HolidayType }))}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {HOLIDAY_TYPES.map((t) => (
                      <option key={t} value={t}>{HOLIDAY_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={adding}
                    className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Add
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </FadeIn>

      <FadeIn delay={0.12}>
        <OtWorkbookImporter
          title="Holiday Excel Import"
          description="Import from holiday sheets with title rows and custom layouts. Pick the sheet, set the real header row, and map the holiday columns manually."
          endpoint="/api/ot/import/holidays"
          onImported={() => {
            void fetchHolidays();
          }}
          fields={[
            {
              key: "holidayDate",
              label: "Date",
              required: true,
              aliases: ["date", "holiday date"],
            },
            {
              key: "holidayName",
              label: "Holiday Name",
              aliases: ["holiday name", "name", "day"],
              helpText: "Optional. If skipped, the system will generate a readable name.",
            },
            {
              key: "holidayType",
              label: "Type",
              aliases: ["type", "holiday type", "compoff status"],
              helpText: "Optional. Defaults to Company if the sheet does not provide a supported type.",
            },
          ]}
        />
      </FadeIn>

      {/* Holiday list */}
      <FadeIn delay={0.15}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Holidays — {year}
            </span>
            <span className="text-xs text-muted-foreground">{holidays.length} entries</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No holidays for {year}. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2.5 px-5 ds-label">Date</th>
                    <th className="px-4 ds-label">Name</th>
                    <th className="px-4 ds-label">Type</th>
                    <th className="px-4 ds-label">Day</th>
                    <th className="px-4 ds-label" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {holidays.map((h) => {
                    const d = new Date(h.holidayDate);
                    const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
                    const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                    return (
                      <tr key={h.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-5 font-mono text-xs text-muted-foreground">{dateStr}</td>
                        <td className="px-4 font-medium text-foreground">{h.holidayName}</td>
                        <td className="px-4">
                          <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${HOLIDAY_TYPE_COLORS[h.holidayType]}`}>
                            {HOLIDAY_TYPE_LABELS[h.holidayType]}
                          </span>
                        </td>
                        <td className="px-4 text-xs text-muted-foreground">{dayName}</td>
                        <td className="px-4">
                          <button
                            onClick={() => handleDelete(h.id)}
                            disabled={deleting === h.id}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            {deleting === h.id
                              ? <Loader2 className="size-4 animate-spin" />
                              : <Trash2 className="size-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
