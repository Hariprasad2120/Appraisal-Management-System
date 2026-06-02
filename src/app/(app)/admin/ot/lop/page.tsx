"use client";

import { useState, useEffect, useCallback } from "react";
import { FadeIn } from "@/components/motion-div";
import { TrendingDown, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OtWorkbookImporter } from "@/components/ot-workbook-importer";

interface Employee { id: string; name: string; employeeNumber: number | null; department: string | null; }
interface LopRecord {
  id: string;
  employee: Employee;
  payrollMonth: string;
  lopDays: number;
  remarks: string | null;
}

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function LopPage() {
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<LopRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ employeeId: "", lopDays: "", remarks: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/ot/employees").then((r) => r.json()).then(setEmployees).catch(() => {});
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/ot/lop?month=${month}`);
      setRecords(await r.json());
    } finally {
      setLoading(false);
    }
  }, [month]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId || !form.lopDays) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/ot/lop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          payrollMonth: month,
          lopDays: parseFloat(form.lopDays),
          remarks: form.remarks || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("LOP record saved");
      setForm({ employeeId: "", lopDays: "", remarks: "" });
      fetchRecords();
    } catch {
      toast.error("Failed to save LOP");
    } finally {
      setSubmitting(false);
    }
  }

  const totalLop = records.reduce((s, r) => s + Number(r.lopDays), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
              <TrendingDown className="size-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="ds-h1">LOP Manager</h1>
              <p className="ds-body mt-0.5">Manage Loss of Pay days per employee per month</p>
            </div>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </FadeIn>

      {/* Add form */}
      <FadeIn delay={0.1}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="size-4" /> Add / Update LOP Entry
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">If a record exists for this employee-month, it will be updated.</p>
          </div>
          <form onSubmit={handleAdd} className="p-5">
            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <label className="ds-label">Employee</label>
                <select
                  required
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeNumber ? `#${emp.employeeNumber} — ` : ""}{emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="ds-label">LOP Days</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={31}
                  step={0.5}
                  placeholder="e.g. 2.5"
                  value={form.lopDays}
                  onChange={(e) => setForm((f) => ({ ...f, lopDays: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="ds-label">Remarks</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Optional"
                    value={form.remarks}
                    onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 shrink-0"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </FadeIn>

      <FadeIn delay={0.12}>
        <OtWorkbookImporter
          title="LOP Excel Import"
          description="Bulk import LOP sheets by mapping employee and LOP columns manually. If your workbook has no month column, the selected month on this page will be used."
          endpoint="/api/ot/import/lop"
          additionalPayload={{ fallbackPayrollMonth: month }}
          onImported={() => {
            void fetchRecords();
          }}
          validateMappings={(mappings) =>
            !mappings.employeeNumber && !mappings.employeeName && !mappings.officialEmail
              ? "Map at least one employee field."
              : null
          }
          fields={[
            {
              key: "employeeNumber",
              label: "Employee ID",
              aliases: ["employee id", "emp id", "employee number", "emp no"],
            },
            {
              key: "employeeName",
              label: "Employee Name",
              aliases: ["employee name", "full name", "first name"],
              helpText: "Use this when the sheet does not carry the numeric employee ID.",
            },
            {
              key: "officialEmail",
              label: "Email ID",
              aliases: ["email", "official email", "email id"],
            },
            {
              key: "payrollMonth",
              label: "Payroll Month",
              aliases: ["month", "payroll month"],
              helpText: "Optional. Falls back to the selected page month.",
            },
            {
              key: "lopDays",
              label: "LOP",
              required: true,
              aliases: ["lop", "lop days", "loss of pay"],
            },
            {
              key: "remarks",
              label: "Remarks",
              aliases: ["remarks", "comment", "comments"],
            },
          ]}
        />
      </FadeIn>

      {/* Summary */}
      {records.length > 0 && (
        <FadeIn delay={0.12}>
          <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-sm">
            <TrendingDown className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-foreground">
              Total LOP for <strong>{month}</strong>: <strong className="text-rose-700 dark:text-rose-400">{totalLop.toFixed(1)} days</strong> across {records.length} employee(s)
            </span>
          </div>
        </FadeIn>
      )}

      {/* Records table */}
      <FadeIn delay={0.15}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">LOP Records — {month}</span>
            <span className="text-xs text-muted-foreground">{records.length} entries</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No LOP records for {month}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2.5 px-5 ds-label">Employee</th>
                    <th className="px-4 ds-label">Department</th>
                    <th className="px-4 ds-label">LOP Days</th>
                    <th className="px-4 ds-label">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-medium text-foreground">{rec.employee.name}</div>
                        {rec.employee.employeeNumber && (
                          <div className="text-xs text-muted-foreground font-mono">#{rec.employee.employeeNumber}</div>
                        )}
                      </td>
                      <td className="px-4 text-xs text-muted-foreground">{rec.employee.department ?? "—"}</td>
                      <td className="px-4">
                        <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                          {Number(rec.lopDays).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 text-xs text-muted-foreground">{rec.remarks ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
