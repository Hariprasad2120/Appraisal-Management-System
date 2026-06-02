import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  IndianRupee,
  Activity,
  Building2,
  Bell,
} from "lucide-react";
import { ManagementCharts } from "../management/management-charts";
import { getSystemDate } from "@/lib/system-date";
import { computeCycleStatus } from "@/lib/workflow";

export default async function PartnerDashboard() {
  const session = await auth();
  const now = await getSystemDate();
  const [cycles, allEmployees, recentNotifs] = await Promise.all([
    prisma.appraisalCycle.findMany({
      include: {
        self: true,
        user: { include: { salary: true } },
        ratings: true,
        decision: { include: { slab: true } },
        assignments: { select: { reviewer: { select: { name: true } }, role: true, availability: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({
      where: { active: true, role: { notIn: ["MANAGEMENT", "PARTNER", "ADMIN"] } },
      include: {
        salary: true,
        cyclesAsEmployee: {
          include: { ratings: true, decision: { include: { slab: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    session?.user
      ? prisma.notification.findMany({
          where: { userId: session.user.id, read: false },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, message: true, link: true, createdAt: true },
        })
      : Promise.resolve([] as { id: string; message: string; link: string | null; createdAt: Date }[]),
  ]);

  const totalDecided = cycles.filter((c) => c.status === "DECIDED").length;
  const totalActive = cycles.filter((c) =>
    ["PENDING_SELF", "SELF_SUBMITTED", "AWAITING_AVAILABILITY", "RATING_IN_PROGRESS"].includes(computeCycleStatus(c, now)),
  ).length;
  const totalReady = cycles.filter((c) =>
    ["RATINGS_COMPLETE", "MANAGEMENT_REVIEW", "DATE_VOTING", "SCHEDULED"].includes(computeCycleStatus(c, now)),
  ).length;

  // Chart data
  const decidedCycles = cycles
    .filter((c) => c.status === "DECIDED" && c.ratings.length > 0)
    .slice(0, 20)
    .reverse();

  const chartData = decidedCycles.map((c) => {
    const avg = c.ratings.reduce((s, r) => s + r.averageScore, 0) / c.ratings.length;
    return {
      name: toTitleCase(c.user.name).split(" ")[0],
      score: parseFloat(avg.toFixed(1)),
      hike: c.decision ? Number(c.decision.finalAmount) : 0,
    };
  });

  const statusCounts = [
    { status: "ACTIVE", count: totalActive, label: "Active Cycles" },
    { status: "RATINGS_COMPLETE", count: totalReady, label: "Ready" },
    { status: "DECIDED", count: totalDecided, label: "Decided" },
  ].filter((x) => x.count > 0);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  // Top performers
  const employeePerf = allEmployees.map((emp) => {
    const decidedEmpCycles = emp.cyclesAsEmployee.filter(
      (c) => c.status === "DECIDED" && c.ratings.length > 0,
    );
    const avgRating =
      decidedEmpCycles.length > 0
        ? decidedEmpCycles.reduce((s, c) => {
            const ca = c.ratings.reduce((rs, r) => rs + r.averageScore, 0) / c.ratings.length;
            return s + ca;
          }, 0) / decidedEmpCycles.length
        : null;
    const lastHike = decidedEmpCycles[0]?.decision?.finalAmount ?? null;
    const lastSlab = decidedEmpCycles[0]?.decision?.slab ?? null;
    return {
      id: emp.id,
      name: emp.name,
      grossAnnum: emp.salary ? Number(emp.salary.grossAnnum) : null,
      avgRating,
      cycleCount: emp.cyclesAsEmployee.length,
      lastHike: lastHike ? Number(lastHike) : null,
      lastSlab,
    };
  }).filter((e) => e.avgRating !== null)
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#008993]/20 flex items-center justify-center">
              <Building2 className="size-5 text-[#008993]" />
            </div>
            <div>
              <h1 className="text-2xl font-normal text-foreground">
                Partner Dashboard
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">Appraisal &amp; workforce overview - Adarsh Shipping</p>
            </div>
          </div>
          <Link
            href="/history"
            className="flex items-center gap-2 border border-border text-foreground rounded-lg px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
          >
            <Activity className="size-4" />
            Full History
          </Link>
        </div>
      </FadeIn>

      {/* KPI cards */}
      <StaggerList className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Employees", value: allEmployees.length, icon: <Users className="size-5 text-[#008993]" />, color: "text-foreground" },
          { label: "Active Appraisals", value: totalActive, icon: <Clock className="size-5 text-amber-400" />, color: "text-amber-400" },
          { label: "Ready for Decision", value: totalReady, icon: <Activity className="size-5 text-blue-400" />, color: "text-blue-400" },
          { label: "Decided", value: totalDecided, icon: <CheckCircle2 className="size-5 text-green-400" />, color: "text-green-400" },
        ].map((kpi) => (
          <StaggerItem key={kpi.label}>
            <Card className="border border-border bg-card shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  {kpi.icon}
                </div>
                <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerList>

      {/* Notifications */}
      {recentNotifs.length > 0 && (
        <FadeIn delay={0.12}>
          <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Bell className="size-3.5" /> Notifications
              </span>
              <Link href="/notifications" className="text-[11px] text-[#00cec4] hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {recentNotifs.map((n) => (
                <div key={n.id} className="px-5 py-3 flex items-start gap-3">
                  <span className="size-1.5 rounded-full bg-[#008993] shrink-0 mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{n.createdAt.toLocaleString("en-IN")}</p>
                  </div>
                  {n.link && <Link href={n.link} className="text-[11px] text-[#00cec4] shrink-0 hover:underline">View</Link>}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Charts */}
      <FadeIn delay={0.15}>
        <ManagementCharts chartData={chartData} statusCounts={statusCounts} />
      </FadeIn>

      {/* Top performers */}
      {employeePerf.length > 0 && (
        <FadeIn delay={0.2}>
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-[#008993]" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                      <th className="py-3 px-4 font-medium">#</th>
                      <th className="px-4 font-medium">Employee</th>
                      <th className="px-4 font-medium">Avg Rating</th>
                      <th className="px-4 font-medium">Cycles</th>
                      <th className="px-4 font-medium">Last Slab</th>
                      <th className="px-4 font-medium">Last Hike</th>
                      <th className="px-4 font-medium">Gross / yr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employeePerf.map((e, i) => (
                      <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500 text-xs">{i + 1}</td>
                        <td className="px-4 font-medium text-foreground">
                          <Link href={`/admin/employees/${e.id}/assign`} className="hover:text-[#00cec4] transition-colors">
                            {toTitleCase(e.name)}
                          </Link>
                        </td>
                        <td className="px-4">
                          <span className="font-bold text-[#00cec4]">{e.avgRating!.toFixed(2)}</span>
                        </td>
                        <td className="px-4 text-slate-400">{e.cycleCount}</td>
                        <td className="px-4">
                          {e.lastSlab ? (
                            <span className="text-xs text-purple-400">{e.lastSlab.label}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 text-green-400 font-medium text-xs">
                          {e.lastHike ? `+${fmt(e.lastHike)}` : "—"}
                        </td>
                        <td className="px-4 text-slate-400 text-xs">
                          {e.grossAnnum ? fmt(e.grossAnnum) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Salary overview */}
      <FadeIn delay={0.25}>
          <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <IndianRupee className="size-4 text-[#ff8333]" />
              Workforce Salary Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                    <th className="py-3 px-4 font-medium">Employee</th>
                    <th className="px-4 font-medium">Gross / yr</th>
                    <th className="px-4 font-medium">CTC / yr</th>
                    <th className="px-4 font-medium">Appraisal Cycles</th>
                    <th className="px-4 font-medium">Last Rating</th>
                    <th className="px-4 font-medium">Last Hike</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allEmployees.slice(0, 25).map((emp) => {
                    const decidedCyc = emp.cyclesAsEmployee.filter(
                      (c) => c.status === "DECIDED" && c.ratings.length > 0,
                    );
                    const lastAvg = decidedCyc[0]
                      ? decidedCyc[0].ratings.reduce((s, r) => s + r.averageScore, 0) / decidedCyc[0].ratings.length
                      : null;
                    const lastHike = decidedCyc[0]?.decision?.finalAmount;
                    return (
                      <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          <Link href={`/admin/employees/${emp.id}/assign`} className="hover:text-[#00cec4] transition-colors">
                            {toTitleCase(emp.name)}
                          </Link>
                        </td>
                        <td className="px-4 text-foreground font-semibold text-xs">
                          {emp.salary ? fmt(Number(emp.salary.grossAnnum)) : "—"}
                        </td>
                        <td className="px-4 text-slate-400 text-xs">
                          {emp.salary ? fmt(Number(emp.salary.ctcAnnum)) : "—"}
                        </td>
                        <td className="px-4 text-slate-500 text-xs">{emp.cyclesAsEmployee.length}</td>
                        <td className="px-4">
                          {lastAvg !== null ? (
                            <span className="font-semibold text-[#00cec4] text-xs">{lastAvg.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 text-green-400 font-medium text-xs">
                          {lastHike ? `+${fmt(Number(lastHike))}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {allEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-600">No employees</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

