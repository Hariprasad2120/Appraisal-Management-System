"use client";

import { useState, useCallback } from "react";
import { FadeIn } from "@/components/motion-div";
import { FileText, Download, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

interface PayrollRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: number | null;
  department: string | null;
  totalOtHours: number;
  totalOtAmount: number;
  totalCompOffDays: number;
  lopDays: number;
}

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function PayrollPage() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setLoaded(false);
    try {
      const r = await fetch(`/api/ot/payroll?month=${month}`);
      if (!r.ok) throw new Error("Failed");
      setRows(await r.json());
      setLoaded(true);
    } catch {
      toast.error("Failed to load payroll summary");
    } finally {
      setLoading(false);
    }
  }, [month]);

  function downloadCSV() {
    if (rows.length === 0) return;
    const headers = ["S.No", "Emp #", "Name", "Department", "LOP Days", "Comp-Off Days", "OT Hours", "OT Amount (₹)"];
    const csvRows = rows.map((r, i) => [
      i + 1,
      r.employeeNumber ?? "",
      r.employeeName,
      r.department ?? "",
      r.lopDays.toFixed(1),
      r.totalCompOffDays.toFixed(1),
      r.totalOtHours.toFixed(2),
      r.totalOtAmount.toFixed(2),
    ]);
    const csv = [headers, ...csvRows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OT_Payroll_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  const totals = rows.reduce(
    (acc, r) => ({
      otAmount: acc.otAmount + r.totalOtAmount,
      otHours: acc.otHours + r.totalOtHours,
      compOff: acc.compOff + r.totalCompOffDays,
      lop: acc.lop + r.lopDays,
    }),
    { otAmount: 0, otHours: 0, compOff: 0, lop: 0 }
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <FileText className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="ds-h1">Final Payroll Summary</h1>
              <p className="ds-body mt-0.5">Merged OT + Comp-Off + LOP per employee</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); setLoaded(false); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={fetchSummary}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Generate
            </button>
            {loaded && rows.length > 0 && (
              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-2 bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Download className="size-4" />
                Download CSV
              </button>
            )}
          </div>
        </div>
      </FadeIn>

      {loaded && rows.length > 0 && (
        <>
          {/* Totals */}
          <FadeIn delay={0.05}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total OT Amount", value: `₹${totals.otAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "text-teal-600 dark:text-teal-400" },
                { label: "Total OT Hours", value: `${totals.otHours.toFixed(1)} hrs`, color: "text-cyan-600 dark:text-cyan-400" },
                { label: "Total Comp-Off", value: `${totals.compOff.toFixed(1)} days`, color: "text-blue-600 dark:text-blue-400" },
                { label: "Total LOP", value: `${totals.lop.toFixed(1)} days`, color: "text-rose-600 dark:text-rose-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Table */}
          <FadeIn delay={0.1}>
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Payroll Summary — {month}</span>
                <span className="text-xs text-muted-foreground">{rows.length} employees</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2.5 px-4 ds-label">#</th>
                      <th className="px-4 ds-label">Employee</th>
                      <th className="px-4 ds-label">Department</th>
                      <th className="px-4 ds-label text-right">LOP Days</th>
                      <th className="px-4 ds-label text-right">Comp-Off</th>
                      <th className="px-4 ds-label text-right">OT Hours</th>
                      <th className="px-4 ds-label text-right">OT Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, i) => (
                      <tr key={row.employeeId} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{i + 1}</td>
                        <td className="px-4">
                          <div className="font-medium text-foreground">{row.employeeName}</div>
                          {row.employeeNumber && (
                            <div className="text-xs text-muted-foreground font-mono">#{row.employeeNumber}</div>
                          )}
                        </td>
                        <td className="px-4 text-xs text-muted-foreground">{row.department ?? "—"}</td>
                        <td className="px-4 text-right">
                          <span className={`text-sm font-semibold ${row.lopDays > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                            {row.lopDays.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 text-right">
                          <span className={`text-sm font-semibold ${row.totalCompOffDays > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
                            {row.totalCompOffDays.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 text-right font-mono text-xs">
                          {row.totalOtHours > 0 ? `${row.totalOtHours.toFixed(2)}h` : "—"}
                        </td>
                        <td className="px-4 text-right">
                          <span className={`text-sm font-semibold ${row.totalOtAmount > 0 ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"}`}>
                            {row.totalOtAmount > 0
                              ? `₹${row.totalOtAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                              : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Footer totals */}
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td className="py-3 px-4" colSpan={3}>
                        <span className="text-xs font-semibold text-foreground">Total</span>
                      </td>
                      <td className="px-4 text-right text-sm font-bold text-rose-600 dark:text-rose-400">{totals.lop.toFixed(1)}</td>
                      <td className="px-4 text-right text-sm font-bold text-blue-600 dark:text-blue-400">{totals.compOff.toFixed(1)}</td>
                      <td className="px-4 text-right text-xs font-bold font-mono">{totals.otHours.toFixed(2)}h</td>
                      <td className="px-4 text-right text-sm font-bold text-teal-600 dark:text-teal-400">
                        ₹{totals.otAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        </>
      )}

      {!loaded && !loading && (
        <FadeIn delay={0.1}>
          <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
            <FileText className="size-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a month and click <strong>Generate</strong> to view the payroll summary.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Only <strong>approved</strong> OT records are included in the summary.
            </p>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
