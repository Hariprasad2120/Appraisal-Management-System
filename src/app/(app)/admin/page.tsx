import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { Users, Clock, AlertCircle, Calendar, ChevronRight, Bell } from "lucide-react";
import { getAppraisalEligibility, getMilestoneAlert, autoCycleType } from "@/lib/appraisal-eligibility";
import { ManagementCharts } from "../management/management-charts";

function getGreeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function ArrowUpRight() {
  return (
    <svg
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      viewBox="0 0 24 24"
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export default async function AdminDashboard() {
  const session = await auth();
  const now = new Date();

  const [allEmployees, activeCycles, pendingAssignments, pendingExtensions, decidedCyclesRaw, recentNotifs] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: { notIn: ["MANAGEMENT", "PARTNER"] }, active: true },
        orderBy: { name: "asc" },
        include: {
          cyclesAsEmployee: {
            where: { status: { notIn: ["CLOSED", "DECIDED"] } },
            take: 1,
            select: { id: true, type: true, status: true },
          },
        },
      }),
      prisma.appraisalCycle.count({ where: { status: { notIn: ["CLOSED", "DECIDED"] } } }),
      prisma.cycleAssignment.count({ where: { availability: "PENDING" } }),
      prisma.extensionRequest.count({ where: { status: "PENDING" } }),
      prisma.appraisalCycle.findMany({
        where: { status: { in: ["DECIDED", "CLOSED"] } },
        include: {
          user: { select: { name: true } },
          ratings: { select: { averageScore: true } },
          decision: { include: { slab: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
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

  const chartData = [...decidedCyclesRaw]
    .reverse()
    .filter((c) => c.ratings.length > 0)
    .map((c) => {
      const avg = c.ratings.reduce((s, r) => s + r.averageScore, 0) / c.ratings.length;
      return {
        name: toTitleCase(c.user.name).split(" ")[0],
        score: parseFloat(avg.toFixed(1)),
        hike: c.decision ? Number(c.decision.finalAmount) : 0,
      };
    });

  const allCyclesForStatus = await prisma.appraisalCycle.findMany({
    select: { status: true },
  });
  const statusMap = new Map<string, number>();
  for (const c of allCyclesForStatus) {
    statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1);
  }
  const statusCounts = [...statusMap.entries()]
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ status, count, label: status.replace(/_/g, " ") }));

  const dueForAppraisal: typeof allEmployees = [];
  const milestoneAlerts: {
    employee: (typeof allEmployees)[0];
    alert: NonNullable<ReturnType<typeof getMilestoneAlert>>;
  }[] = [];

  for (const emp of allEmployees) {
    const hasActive = emp.cyclesAsEmployee.length > 0;
    const eligibility = getAppraisalEligibility(emp.joiningDate, now);
    const alert = getMilestoneAlert(emp.joiningDate, now);
    if (eligibility.eligible && !hasActive) dueForAppraisal.push(emp);
    if (alert && alert.type === "EPF_ESI") milestoneAlerts.push({ employee: emp, alert });
  }

  const stats = [
    {
      label: "Due This Month",
      value: dueForAppraisal.length,
      icon: Calendar,
      accent: "stat-cyan",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      iconBg: "bg-cyan-50 dark:bg-cyan-900/20",
      accentColor: "#00cec4",
    },
    {
      label: "Active Cycles",
      value: activeCycles,
      icon: Clock,
      accent: "stat-amber",
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-900/20",
      accentColor: "#ffaa2d",
    },
    {
      label: "Pending Availability",
      value: pendingAssignments,
      icon: Users,
      accent: "stat-teal",
      iconColor: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-50 dark:bg-teal-900/20",
      accentColor: "#0e8a95",
    },
    {
      label: "Pending Extensions",
      value: pendingExtensions,
      icon: AlertCircle,
      accent: "stat-orange",
      iconColor: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-50 dark:bg-orange-900/20",
      accentColor: "#ff8333",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="ds-h1">
              {session?.user
                ? `Good ${getGreeting(now)}, ${toTitleCase(session.user.name?.split(" ")[0] ?? "there")}`
                : "Admin Dashboard"}
            </h1>
            <p className="ds-body mt-1">
              {now.toLocaleString("default", { month: "long", year: "numeric" })}
            </p>
          </div>
          {recentNotifs.length > 0 && (
            <Link
              href="/notifications"
              className="inline-flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <Bell className="size-3.5" />
              {recentNotifs.length} unread
            </Link>
          )}
        </div>
      </FadeIn>

      {/* Stat cards */}
      <StaggerList className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StaggerItem key={s.label}>
            <div className={`bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 ${s.accent}`}>
              {/* Icon row + arrow */}
              <div className="flex items-start justify-between mb-3">
                <div className={`size-9 rounded-[10px] ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`size-[18px] ${s.iconColor}`} />
                </div>
                <span className="text-muted-foreground/50 mt-0.5">
                  <ArrowUpRight />
                </span>
              </div>
              <div className="ds-stat">{s.value}</div>
              <div className="ds-small mt-1">{s.label}</div>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>

      {/* Milestone alerts */}
      {milestoneAlerts.length > 0 && (
        <FadeIn delay={0.15}>
          <div className="border border-orange-200 dark:border-orange-900/50 shadow-sm bg-orange-50/50 dark:bg-orange-950/10 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-orange-200/60 dark:border-orange-900/40">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400">
                <Bell className="size-4" /> Milestone Alerts ({milestoneAlerts.length})
              </div>
            </div>
            <div className="px-5 py-4 space-y-2">
              {milestoneAlerts.map(({ employee, alert }) => (
                <div key={employee.id} className="flex items-center justify-between text-sm flex-wrap gap-2">
                  <div>
                    <span className="font-medium text-foreground">{toTitleCase(employee.name)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{alert.label}</span>
                  </div>
                  <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full px-2.5 py-0.5 font-medium">
                    {alert.type === "EPF_ESI" ? "EPF/ESI Alert" : "Training"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Appraisals due */}
      <FadeIn delay={0.2}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Appraisals Due This Month</span>
            {dueForAppraisal.length > 0 && (
              <span className="text-xs text-primary font-medium">{dueForAppraisal.length} pending</span>
            )}
          </div>
          <div className="px-5 py-4">
            {dueForAppraisal.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No appraisals due this month.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2.5 px-2 ds-label">Emp #</th>
                      <th className="px-2 ds-label">Name</th>
                      <th className="px-2 ds-label hidden sm:table-cell">Department</th>
                      <th className="px-2 ds-label hidden sm:table-cell">Joining</th>
                      <th className="px-2 ds-label">Type</th>
                      <th className="px-2 ds-label">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dueForAppraisal.map((u) => {
                      const cycleType = autoCycleType(u.joiningDate, now);
                      return (
                        <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-2 text-muted-foreground font-mono text-xs">
                            {u.employeeNumber ?? "—"}
                          </td>
                          <td className="px-2 font-semibold text-foreground">
                            {toTitleCase(u.name)}
                          </td>
                          <td className="px-2 text-muted-foreground text-xs hidden sm:table-cell">
                            {u.department ?? "—"}
                          </td>
                          <td className="px-2 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                            {u.joiningDate.toLocaleDateString()}
                          </td>
                          <td className="px-2">
                            <span
                              className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                                cycleType === "INTERIM"
                                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                                  : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                              }`}
                            >
                              {cycleType}
                            </span>
                          </td>
                          <td className="px-2">
                            <Link
                              href={`/admin/employees/${u.id}/assign`}
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium transition-colors"
                            >
                              Assign <ChevronRight className="size-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Charts */}
      {chartData.length > 0 && (
        <FadeIn delay={0.25}>
          <ManagementCharts chartData={chartData} statusCounts={statusCounts} />
        </FadeIn>
      )}

      {/* Quick links */}
      <FadeIn delay={0.3}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/admin/employees", label: "Employees", desc: "Manage all users" },
            { href: "/admin/cycles", label: "All Cycles", desc: "View appraisal cycles" },
            { href: "/admin/slabs", label: "Increment Slabs", desc: "Configure hike bands" },
            {
              href: "/admin/extensions",
              label: "Extensions",
              desc: `${pendingExtensions} pending`,
            },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="block group">
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
