"use client";

import { useState, useEffect, useCallback } from "react";
import { FadeIn } from "@/components/motion-div";
import { Layers, Check, X, Loader2, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["", "PENDING", "APPROVED", "REJECTED"] as const;
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  REJECTED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};
const DAY_TYPE_LABELS: Record<string, string> = {
  WORKING_DAY: "Working Day",
  HOLIDAY: "Holiday",
  WEEKEND: "Weekend",
};

interface OtRecord {
  id: string;
  employee: { id: string; name: string; employeeNumber: number | null; department: string | null };
  attendanceDate: string;
  dayType: string;
  hoursWorked: number;
  otHours: number;
  otAmount: number;
  compOffDays: number;
  approvalStatus: string;
  rejectionRemarks: string | null;
  approvedBy: { name: string } | null;
}

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function OtRecordsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [records, setRecords] = useState<OtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approvingBulk, setApprovingBulk] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({ month });
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/ot/records?${params}`);
      setRecords(await r.json());
    } finally {
      setLoading(false);
    }
  }, [month, statusFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map((r) => r.id)));
  }

  async function handleApprove(ids: string[]) {
    if (ids.length === 0) return;
    setApprovingBulk(true);
    try {
      const res = await fetch("/api/ot/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed");
      toast.success(`${data.updated} record(s) approved`);
      fetchRecords();
    } catch {
      toast.error("Approval failed");
    } finally {
      setApprovingBulk(false);
      setActionId(null);
    }
  }

  async function handleReject() {
    if (!rejectModal || !rejectRemarks.trim()) return;
    setActionId(rejectModal.id);
    try {
      const res = await fetch("/api/ot/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectModal.id, remarks: rejectRemarks }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Record rejected");
      setRejectModal(null);
      setRejectRemarks("");
      fetchRecords();
    } catch {
      toast.error("Rejection failed");
    } finally {
      setActionId(null);
    }
  }

  const totalOtAmount = records
    .filter((r) => r.approvalStatus === "APPROVED")
    .reduce((sum, r) => sum + Number(r.otAmount), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Layers className="size-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="ds-h1">OT Records</h1>
              <p className="ds-body mt-0.5">Review and approve overtime entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s ? STATUS_LABELS[s] : "All Statuses"}</option>
              ))}
            </select>
            {selected.size > 0 && (
              <button
                onClick={() => handleApprove([...selected])}
                disabled={approvingBulk}
                className="inline-flex items-center gap-1.5 bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
              >
                {approvingBulk ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                Approve {selected.size}
              </button>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Summary */}
      {records.length > 0 && (
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Records", value: records.length },
              { label: "Pending", value: records.filter((r) => r.approvalStatus === "PENDING").length, color: "text-amber-600 dark:text-amber-400" },
              { label: "Approved", value: records.filter((r) => r.approvalStatus === "APPROVED").length, color: "text-teal-600 dark:text-teal-400" },
              { label: "OT Amount", value: `₹${totalOtAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "text-primary" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className={`text-lg font-bold ${stat.color ?? "text-foreground"}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{records.length} record(s)</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No OT records found. Import attendance and run &quot;Process OT&quot; first.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={selected.size === records.length && records.length > 0}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 ds-label">Employee</th>
                    <th className="px-4 ds-label">Date</th>
                    <th className="px-4 ds-label">Day Type</th>
                    <th className="px-4 ds-label">Hours</th>
                    <th className="px-4 ds-label">OT Hrs</th>
                    <th className="px-4 ds-label">OT Amount</th>
                    <th className="px-4 ds-label">Comp-Off</th>
                    <th className="px-4 ds-label">Status</th>
                    <th className="px-4 ds-label">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((rec) => {
                    const date = new Date(rec.attendanceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
                    return (
                      <tr key={rec.id} className={`hover:bg-muted/40 transition-colors ${selected.has(rec.id) ? "bg-primary/5" : ""}`}>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selected.has(rec.id)}
                            onChange={() => toggleSelect(rec.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4">
                          <div className="font-medium text-foreground">{rec.employee.name}</div>
                          <div className="text-xs text-muted-foreground">{rec.employee.department ?? "—"}</div>
                        </td>
                        <td className="px-4 font-mono text-xs text-muted-foreground">{date}</td>
                        <td className="px-4">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                            rec.dayType === "WORKING_DAY"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              : rec.dayType === "HOLIDAY"
                              ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          }`}>
                            {DAY_TYPE_LABELS[rec.dayType] ?? rec.dayType}
                          </span>
                        </td>
                        <td className="px-4 text-xs font-mono">{Number(rec.hoursWorked).toFixed(2)}h</td>
                        <td className="px-4 text-xs font-mono text-primary">
                          {Number(rec.otHours) > 0 ? `${Number(rec.otHours).toFixed(2)}h` : "—"}
                        </td>
                        <td className="px-4 text-xs font-mono">
                          {Number(rec.otAmount) > 0 ? `₹${Number(rec.otAmount).toFixed(0)}` : "—"}
                        </td>
                        <td className="px-4 text-xs font-mono">
                          {Number(rec.compOffDays) > 0 ? `${Number(rec.compOffDays)} day(s)` : "—"}
                        </td>
                        <td className="px-4">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[rec.approvalStatus] ?? ""}`}>
                            {STATUS_LABELS[rec.approvalStatus] ?? rec.approvalStatus}
                          </span>
                          {rec.rejectionRemarks && (
                            <div className="text-xs text-muted-foreground mt-0.5 max-w-[120px] truncate" title={rec.rejectionRemarks}>
                              {rec.rejectionRemarks}
                            </div>
                          )}
                        </td>
                        <td className="px-4">
                          {rec.approvalStatus === "PENDING" && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => { setActionId(rec.id); handleApprove([rec.id]); }}
                                disabled={actionId === rec.id}
                                title="Approve"
                                className="size-7 flex items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 transition-colors"
                              >
                                {actionId === rec.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                              </button>
                              <button
                                onClick={() => setRejectModal({ id: rec.id })}
                                title="Reject"
                                className="size-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          )}
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

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold text-foreground mb-4">Reject OT Entry</h2>
            <div className="space-y-3">
              <label className="ds-label">Rejection Remarks *</label>
              <textarea
                rows={3}
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Enter reason for rejection…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <div className="flex items-center gap-2 mt-4 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectRemarks(""); }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectRemarks.trim() || actionId !== null}
                className="inline-flex items-center gap-2 bg-destructive text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-60"
              >
                {actionId !== null ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
