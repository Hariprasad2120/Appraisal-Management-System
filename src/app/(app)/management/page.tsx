import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import Link from "next/link";
import { getSalaryTier } from "@/lib/criteria";
import {
  BarChart3,
  ChevronRight,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  IndianRupee,
  Activity,
  Bell,
} from "lucide-react";
import type { CycleStatus } from "@/generated/prisma/enums";
import { ManagementCharts } from "./management-charts";
import { getSystemDate } from "@/lib/system-date";
import { computeCycleStatus } from "@/lib/workflow";

const STATUS_BADGE: Record<string, string> = {
  RATINGS_COMPLETE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  MANAGEMENT_REVIEW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DATE_VOTING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  SCHEDULED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  DECIDED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CLOSED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const ALL_STATUSES: CycleStatus[] = [
  "PENDING_SELF",
  "SELF_SUBMITTED",
  "AWAITING_AVAILABILITY",
  "RATING_IN_PROGRESS",
  "RATINGS_COMPLETE",
  "MANAGEMENT_REVIEW",
  "DATE_VOTING",
  "SCHEDULED",
  "DECIDED",
  "CLOSED",
];

export default async function ManagementDashboard() {
  const session = await auth();
  const now = await getSystemDate();

  const [cycles, slabs, allEmployees, recentNotifs] = await Promise.all([
    prisma.appraisalCycle.findMany({
      include: {
        self: true,
        user: {
          include: {
            salary: true,
            salaryRevisions: { orderBy: { effectiveFrom: "desc" }, take: 3 },
          },
        },
        claimedBy: { select: { name: true } },
        ratings: true,
        decision: { include: { slab: true } },
        assignments: { select: { reviewer: { select: { name: true } }, role: true, availability: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.incrementSlab.findMany({ orderBy: { minRating: "desc" } }),
    prisma.user.findMany({
      where: { active: true, role: { notIn: ["MANAGEMENT", "PARTNER", "ADMIN"] } },
      include: {
        salary: true,
        cyclesAsEmployee: { include: { ratings: true, decision: { include: { slab: true } } } },
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

  const getDisplayStatus = (cycle: (typeof cycles)[number]) => computeCycleStatus(cycle, now);

  const actionableCycles = cycles.filter((c) =>
    ["RATINGS_COMPLETE", "MANAGEMENT_REVIEW", "DATE_VOTING", "SCHEDULED", "DECIDED"].includes(getDisplayStatus(c))
  );
  const totalDecided = cycles.filter((c) => c.status === "DECIDED").length;
  const totalPending = cycles.filter((c) => {
    const status = getDisplayStatus(c);
    return status === "MANAGEMENT_REVIEW" || status === "RATINGS_COMPLETE";
  }).length;
  const totalClosed = cycles.filter((c) => c.status === "CLOSED").length;

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

  const statusCounts = ALL_STATUSES.map((s) => ({
    status: s,
    count: cycles.filter((c) => getDisplayStatus(c) === s).length,
    label: s.replace(/_/g, " "),
  })).filter((x) => x.count > 0);

  const employeePerf = allEmployees
    .map((emp) => {
      const decidedEmpCycles = emp.cyclesAsEmployee.filter(
        (c) => c.status === "DECIDED" && c.ratings.length > 0
      );
      const avgRating =
        decidedEmpCycles.length > 0
          ? decidedEmpCycles.reduce((s, c) => {
              const cycleAvg =
                c.ratings.reduce((rs, r) => rs + r.averageScore, 0) / c.ratings.length;
              return s + cycleAvg;
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
    })
    .filter((e) => e.avgRating !== null)
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    .slice(0, 10);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const kpis = [
    {
      label: "Total Cycles",
      value: cycles.length,
      icon: <Users className="size-5 text-primary" />,
      accent: "stat-teal",
    },
    {
      label: "Awaiting Decision",
      value: totalPending,
      icon: <Clock className="size-5 text-amber-500" />,
      accent: "stat-amber",
    },
    {
      label: "Decided",
      value: totalDecided,
      icon: <CheckCircle2 className="size-5 text-green-500" />,
      accent: "stat-green",
    },
    {
      label: "Closed",
      value: totalClosed,
      icon: <IndianRupee className="size-5 text-muted-foreground" />,
      accent: "stat-cyan",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {session?.user ? `Good ${getGreeting(now)}, ${toTitleCase(session.user.name?.split(" ")[0] ?? "there")}` : "Management Dashboard"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Appraisal overview, employee performance &amp; salary impact
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/management/salary"
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <BarChart3 className="size-4" />
              Salary Calculator
            </Link>
            <Link
              href="/history"
              className="flex items-center gap-2 border border-border text-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Activity className="size-4" />
              Full History
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* KPI cards */}
      <StaggerList className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <Card className={`border border-border shadow-sm bg-card ${kpi.accent}`}>
              <CardContent className="p-5">
                <div className="mb-3">{kpi.icon}</div>
                <div className="text-3xl font-bold text-foreground">{kpi.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
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
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Bell className="size-3.5" /> Notifications
              </span>
              <Link href="/notifications" className="text-[11px] text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {recentNotifs.map((n) => (
                <div key={n.id} className="px-5 py-3 flex items-start gap-3">
                  <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.createdAt.toLocaleString("en-IN")}</p>
                  </div>
                  {n.link && <Link href={n.link} className="text-[11px] text-primary shrink-0 hover:underline">View</Link>}
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
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Top Performers (by avg appraisal rating)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                      <th className="py-3 px-4 font-medium">#</th>
                      <th className="px-4 font-medium">Employee</th>
                      <th className="px-4 font-medium">Avg Rating</th>
                      <th className="px-4 font-medium">Cycles</th>
                      <th className="px-4 font-medium">Last Slab</th>
                      <th className="px-4 font-medium">Last Hike</th>
                      <th className="px-4 font-medium">Current Gross</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employeePerf.map((e, i) => (
                      <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-4 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 font-medium text-foreground">
                          <Link
                            href={`/admin/employees/${e.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {toTitleCase(e.name)}
                          </Link>
                        </td>
                        <td className="px-4">
                          <span className="font-bold text-primary">
                            {e.avgRating!.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 text-muted-foreground">{e.cycleCount}</td>
                        <td className="px-4">
                          {e.lastSlab ? (
                            <span className="text-xs text-purple-600 dark:text-purple-400">
                              {e.lastSlab.label}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 text-green-600 dark:text-green-400 font-medium text-xs">
                          {e.lastHike ? `+${fmt(e.lastHike)}` : "—"}
                        </td>
                        <td className="px-4 text-muted-foreground text-xs">
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

      {/* Actionable appraisals */}
      <FadeIn delay={0.25}>
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-foreground">
                Appraisal Results — Action Required
              </CardTitle>
              <Link
                href="/history"
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Full history →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                    <th className="py-3 px-4 font-medium">Employee</th>
                    <th className="px-4 font-medium">Type</th>
                    <th className="px-4 font-medium">Status</th>
                    <th className="px-4 font-medium">Avg Rating</th>
                    <th className="px-4 font-medium">Slab</th>
                    <th className="px-4 font-medium">Est. Hike</th>
                    <th className="px-4 font-medium">Current Gross</th>
                    <th className="px-4 font-medium">Reviewers</th>
                    <th className="px-4 font-medium">Claim</th>
                    <th className="px-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {actionableCycles.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-muted-foreground">
                        No appraisals ready for management review.
                      </td>
                    </tr>
                  )}
                  {actionableCycles.map((c) => {
                    const displayStatus = getDisplayStatus(c);
                    const avg =
                      c.ratings.length > 0
                        ? c.ratings.reduce((s, r) => s + r.averageScore, 0) / c.ratings.length
                        : null;
                    const slab = null; // replaced by tieredSlab below
                    const grossAnnum = c.user.salary ? Number(c.user.salary.grossAnnum) : null;
                    const monthlyGross = grossAnnum ? grossAnnum / 12 : null;
                    const tierKey = monthlyGross ? getSalaryTier(monthlyGross) : null;
                    const dbTier = tierKey === "upto15k" ? "UPTO_15K" : tierKey === "upto30k" ? "BTW_15K_30K" : "ABOVE_30K";
                    const flooredAvg = avg !== null ? Math.floor(avg) : null;
                    const tieredSlab = flooredAvg !== null && grossAnnum
                      ? slabs.find((s) =>
                          flooredAvg >= s.minRating && flooredAvg <= s.maxRating &&
                          (s.salaryTier === dbTier || s.salaryTier === "ALL")
                        )
                      : slab;
                    const hikeAmt =
                      tieredSlab && grossAnnum
                        ? Math.round((grossAnnum * tieredSlab.hikePercent) / 100)
                        : null;
                    const reviewerNames = c.assignments
                      .map((a) => a.reviewer.name.split(" ")[0])
                      .join(", ");

                    return (
                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          <Link
                            href={`/admin/employees/${c.userId}`}
                            className="hover:text-primary transition-colors"
                          >
                            {toTitleCase(c.user.name)}
                          </Link>
                        </td>
                        <td className="px-4 text-muted-foreground text-xs">{c.type}</td>
                        <td className="px-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              STATUS_BADGE[displayStatus] ??
                              "bg-muted text-muted-foreground"
                            }`}
                          >
                            {displayStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 font-semibold text-primary">
                          {avg?.toFixed(2) ?? "—"}
                        </td>
                        <td className="px-4">
                          {tieredSlab ? (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">
                              {tieredSlab.label} ({tieredSlab.hikePercent}%)
                            </span>
                          ) : c.decision?.slab ? (
                            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                              {c.decision.slab.label}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4">
                          {hikeAmt !== null ? (
                            <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1 text-xs">
                              <TrendingUp className="size-3" />+{fmt(hikeAmt)}
                            </span>
                          ) : c.decision ? (
                            <span className="text-green-600 dark:text-green-400 font-medium text-xs">
                              {fmt(Number(c.decision.finalAmount))}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 text-muted-foreground text-xs">
                          {grossAnnum ? fmt(grossAnnum) : "—"}
                        </td>
                      <td className="px-4 text-muted-foreground text-xs">
                          {reviewerNames || "—"}
                        </td>
                      <td className="px-4 text-muted-foreground text-xs">
                        {c.claimedBy?.name ? (
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full px-2 py-0.5">
                            {toTitleCase(c.claimedBy.name)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                        <td className="px-4">
                          <Link
                            href={`/management/decide/${c.id}`}
                            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                          >
                            Decide <ChevronRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Employee salary overview */}
      <FadeIn delay={0.3}>
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <IndianRupee className="size-4 text-amber-500" />
              Employee Salary Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                    <th className="py-3 px-4 font-medium">Employee</th>
                    <th className="px-4 font-medium">Gross / yr</th>
                    <th className="px-4 font-medium">CTC / yr</th>
                    <th className="px-4 font-medium">Basic / mo</th>
                    <th className="px-4 font-medium">Cycles</th>
                    <th className="px-4 font-medium">Last Rating</th>
                    <th className="px-4 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allEmployees.slice(0, 30).map((emp) => {
                    const decidedEmpCycles = emp.cyclesAsEmployee.filter(
                      (c) => c.status === "DECIDED" && c.ratings.length > 0
                    );
                    const lastAvg =
                      decidedEmpCycles[0]
                        ? decidedEmpCycles[0].ratings.reduce(
                            (s, r) => s + r.averageScore,
                            0
                          ) / decidedEmpCycles[0].ratings.length
                        : null;
                    return (
                      <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          <Link
                            href={`/admin/employees/${emp.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {toTitleCase(emp.name)}
                          </Link>
                        </td>
                        <td className="px-4 text-foreground font-semibold text-xs">
                          {emp.salary ? fmt(Number(emp.salary.grossAnnum)) : "—"}
                        </td>
                        <td className="px-4 text-muted-foreground text-xs">
                          {emp.salary ? fmt(Number(emp.salary.ctcAnnum)) : "—"}
                        </td>
                        <td className="px-4 text-muted-foreground text-xs">
                          {emp.salary ? fmt(Number(emp.salary.basic)) : "—"}
                        </td>
                        <td className="px-4 text-muted-foreground text-xs">
                          {emp.cyclesAsEmployee.length}
                        </td>
                        <td className="px-4">
                          {lastAvg !== null ? (
                            <span className="font-semibold text-primary text-xs">
                              {lastAvg.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4">
                          <Link
                            href={`/admin/employees/${emp.id}`}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {allEmployees.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No employees found
                      </td>
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

function getGreeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
