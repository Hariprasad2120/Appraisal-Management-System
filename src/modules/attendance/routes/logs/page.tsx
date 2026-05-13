"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type LogRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: string | null;
  approvalStatus: string;
  remarks: string | null;
};

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const loadRef = useRef(0);

  const load = useCallback(() => {
    const id = ++loadRef.current;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ot/attendance?from=${from}&to=${to}`);
        if (res.ok && id === loadRef.current) {
          const data = await res.json();
          setLogs(data.logs ?? []);
        }
      } finally {
        if (id === loadRef.current) setLoading(false);
      }
    })();
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter((l) =>
    !search || l.employeeName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Raw biometric attendance records</p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-36" />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-36" />
          </div>
          <button onClick={load} className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 self-end">Load</button>
          <div className="flex-1 min-w-48">
            <Label htmlFor="search" className="text-xs">Search employee</Label>
            <Input id="search" placeholder="Name…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{filtered.length} records</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No records found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-3">Employee</th>
                    <th className="text-left py-2 pr-3">Date</th>
                    <th className="text-left py-2 pr-3">Check In</th>
                    <th className="text-left py-2 pr-3">Check Out</th>
                    <th className="text-right py-2 pr-3">Hrs</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 font-medium">{l.employeeName}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{new Date(l.attendanceDate).toLocaleDateString("en-IN")}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{l.checkIn ? new Date(l.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{l.checkOut ? new Date(l.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="py-1.5 pr-3 text-right">{l.totalHours ?? "—"}</td>
                      <td className="py-1.5"><Badge variant={l.approvalStatus === "Approved" ? "default" : "secondary"}>{l.approvalStatus}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
