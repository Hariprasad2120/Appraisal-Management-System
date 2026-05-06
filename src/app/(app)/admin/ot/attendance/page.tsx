"use client";

import { useState, useEffect, useCallback } from "react";
import { FadeIn } from "@/components/motion-div";
import { ClipboardList, Plus, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OtWorkbookImporter } from "@/components/ot-workbook-importer";

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
    <div className="space-y-6 max-w-6xl">
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
              onImported={() => {
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
    </div>
  );
}
