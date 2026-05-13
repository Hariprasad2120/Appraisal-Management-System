"use client";

import { useState, useEffect, useCallback } from "react";
import { FadeIn } from "@/components/motion-div";
import { ClipboardList, Plus, Loader2, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OtWorkbookImporter } from "@/modules/attendance/components/ot-workbook-importer";

interface Employee {
  id: string;
  name: string;
  employeeNumber: number | null;
  department: string | null;
}

interface AttendanceLog {
  id: string;
  employee: Employee;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number | null;
  approvalStatus: string;
  remarks: string | null;
}

type ImportSkippedDetail = {
  row: number;
  reason: string;
  payload: unknown;
  employeeId?: string;
  employeeName?: string;
};

type AttendanceImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  skippedDetails?: ImportSkippedDetail[];
};

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function AttendancePage() {
  const [month, setMonth] = useState(currentMonth());
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    attendanceDate: "",
    checkIn: "",
    checkOut: "",
    approvalStatus: "Approved",
    remarks: "",
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Import results modal state
  const [importResult, setImportResult] = useState<AttendanceImportResult | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/ot/attendance?month=${month}`);
      setLogs(await r.json());
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetch("/api/ot/employees")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => {});
  }, []);

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId || !form.attendanceDate) return;
    setSubmitting(true);
    try {
      const checkIn = form.checkIn ? `${form.attendanceDate}T${form.checkIn}:00` : undefined;
      const checkOut = form.checkOut ? `${form.attendanceDate}T${form.checkOut}:00` : undefined;

      const res = await fetch("/api/ot/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: [{ ...form, checkIn, checkOut }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed");
      toast.success(`Added ${data.inserted} record(s)`);
      setForm({
        employeeId: "",
        attendanceDate: "",
        checkIn: "",
        checkOut: "",
        approvalStatus: "Approved",
        remarks: "",
      });
      void fetchLogs();
    } catch {
      toast.error("Failed to add attendance");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProcessOT() {
    setProcessing(true);
    try {
      const res = await fetch("/api/ot/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed");
      toast.success(`OT processed - ${data.processed} records calculated, ${data.skipped} skipped`);
      void fetchLogs();
    } catch {
      toast.error("Failed to process OT");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl relative">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <ClipboardList className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="ds-h1">Attendance Import</h1>
              <p className="ds-body mt-0.5">Manual entry plus Excel import with header-row selection and field mapping</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={handleProcessOT}
              disabled={processing}
              className="inline-flex items-center gap-2 bg-teal-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
            >
              {processing ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Process OT for {month}
            </button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <Tabs defaultValue="excel" className="space-y-4">
          <TabsList>
            <TabsTrigger value="excel">Excel Import</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="excel">
            <OtWorkbookImporter
              title="Attendance Workbook Import"
              description="Choose the source sheet, pick the real header row, and map employee/date/time fields manually. This is designed for sheets like your OT workbook where headers start below title rows."
              endpoint="/api/ot/import/attendance"
              onImported={(result) => {
                setImportResult(result as AttendanceImportResult);
                void fetchLogs();
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
                  helpText: "Recommended when your sheet has numeric employee IDs.",
                },
                {
                  key: "employeeName",
                  label: "Employee Name",
                  aliases: ["name", "employee name", "full name"],
                },
                {
                  key: "officialEmail",
                  label: "Email ID",
                  aliases: ["email", "official email", "email id"],
                },
                {
                  key: "attendanceDate",
                  label: "Date",
                  required: true,
                  aliases: ["date", "attendance date"],
                },
                {
                  key: "checkIn",
                  label: "First In",
                  aliases: ["first in", "check in", "check-in", "in time"],
                },
                {
                  key: "checkOut",
                  label: "Last Out",
                  aliases: ["last out", "check out", "check-out", "out time"],
                },
                {
                  key: "totalHours",
                  label: "Total Hours",
                  aliases: ["total hours", "total hrs", "hours worked"],
                  helpText: "If check-in and check-out are mapped, total hours will be recalculated automatically.",
                },
                {
                  key: "permissionMins",
                  label: "Permission (Mins)",
                  aliases: ["permission", "permission mins", "perm mins"],
                  helpText: "Deducts from standard 8 hours (e.g. 60 for 1 hr permission)",
                },
                {
                  key: "earlyLeavingMins",
                  label: "Early Leaving (Mins)",
                  aliases: ["early leaving", "early out", "early min"],
                },
                {
                  key: "approvalStatus",
                  label: "Status",
                  aliases: ["status", "approval status"],
                },
                {
                  key: "regularizationStatus",
                  label: "Regularization",
                  aliases: ["regularization", "regularisation", "regularization status", "regularisation status"],
                },
                {
                  key: "remarks",
                  label: "Remarks",
                  aliases: ["remarks", "comment", "comments"],
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="manual">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Plus className="size-4" /> Manual Entry
                </span>
              </div>
              <form onSubmit={handleAddLog} className="p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="ds-label">Employee</label>
                    <select
                      required
                      value={form.employeeId}
                      onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">Select employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employeeNumber ? `#${emp.employeeNumber} - ` : ""}
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="ds-label">Date</label>
                    <input
                      type="date"
                      required
                      value={form.attendanceDate}
                      onChange={(e) => setForm((f) => ({ ...f, attendanceDate: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="ds-label">Approval Status</label>
                    <select
                      value={form.approvalStatus}
                      onChange={(e) => setForm((f) => ({ ...f, approvalStatus: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option>Approved</option>
                      <option>Pending</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="ds-label">Check-In Time</label>
                    <input
                      type="time"
                      value={form.checkIn}
                      onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="ds-label">Check-Out Time</label>
                    <input
                      type="time"
                      value={form.checkOut}
                      onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
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
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </FadeIn>

      <FadeIn delay={0.16}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Attendance Logs - {month}</span>
            <span className="text-xs text-muted-foreground">{logs.length} records</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No attendance logs for {month}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2.5 px-5 ds-label">Employee</th>
                    <th className="px-4 ds-label">Date</th>
                    <th className="px-4 ds-label">Check-In</th>
                    <th className="px-4 ds-label">Check-Out</th>
                    <th className="px-4 ds-label">Hours</th>
                    <th className="px-4 ds-label">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => {
                    const checkIn = log.checkIn
                      ? new Date(log.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "-";
                    const checkOut = log.checkOut
                      ? new Date(log.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "-";
                    const date = new Date(log.attendanceDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    });
                    return (
                      <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-5">
                          <div className="font-medium text-foreground">{log.employee.name}</div>
                          <div className="text-xs text-muted-foreground">{log.employee.department ?? "-"}</div>
                        </td>
                        <td className="px-4 font-mono text-xs text-muted-foreground">{date}</td>
                        <td className="px-4 font-mono text-xs">{checkIn}</td>
                        <td className="px-4 font-mono text-xs">{checkOut}</td>
                        <td className="px-4 text-xs font-medium">
                          {log.totalHours !== null ? `${Number(log.totalHours).toFixed(2)}h` : "-"}
                        </td>
                        <td className="px-4">
                          <span
                            className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                              log.approvalStatus === "Approved"
                                ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {log.approvalStatus}
                          </span>
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

      {/* Import Result Modal */}
      {importResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${importResult.errors.length > 0 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" : "bg-teal-100 dark:bg-teal-900/30 text-teal-600"}`}>
                  {importResult.errors.length > 0 ? <AlertCircle className="size-5" /> : <CheckCircle2 className="size-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Import Summary</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {importResult.errors.length > 0 ? "Import completed with some skipped rows." : "Import completed successfully."}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{importResult.imported}</div>
                  <div className="text-xs font-medium text-teal-800 dark:text-teal-300 mt-1 uppercase tracking-wider">Imported</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResult.updated}</div>
                  <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mt-1 uppercase tracking-wider">Updated</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{importResult.skipped}</div>
                  <div className="text-xs font-medium text-amber-800 dark:text-amber-300 mt-1 uppercase tracking-wider">Skipped</div>
                </div>
              </div>

              {importResult.skippedDetails && importResult.skippedDetails.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="size-4 text-amber-500" />
                    Skipped Row Details
                  </h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {importResult.skippedDetails.map((error, idx: number) => (
                      <div key={idx} className="p-3 bg-muted/30 border border-border rounded-xl text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-foreground">Row {error.row}</span>
                          <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-bold uppercase">
                            {error.reason}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground bg-background/50 p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(error.payload, null, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
              <button
                onClick={() => setImportResult(null)}
                className="bg-foreground text-background rounded-lg px-6 py-2 text-sm font-medium hover:bg-foreground/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

