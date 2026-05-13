import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { getAppraisalEligibility, autoCycleType } from "@/lib/appraisal-eligibility";
import { Calendar, Users, Clock, CalendarDays } from "lucide-react";
import { AppraisalCalendar } from "@/components/appraisal-calendar";
import { AppraisalsMonthFilter } from "./appraisals-month-filter";
import { getCachedSession as auth } from "@/lib/auth";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

export default async function AppraisalsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [allUsers, activeCycles] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, role: { notIn: ["MANAGEMENT", "PARTNER"] }, active: true },
      orderBy: { name: "asc" },
      include: {
        salary: { select: { grossAnnum: true } },
        cyclesAsEmployee: {
          where: {
            organizationId,
            OR: [
              { status: { notIn: ["CLOSED", "DECIDED"] } },
              {
                status: { in: ["CLOSED", "DECIDED"] },
                startDate: { gte: monthStart, lt: nextMonthStart },
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, type: true, status: true, startDate: true },
        },
      },
    }),
    prisma.appraisalCycle.findMany({
      where: { organizationId, status: { notIn: ["CLOSED", "DECIDED"] } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const dueThisMonth = allUsers.filter((u) => {
    const hasActive = u.cyclesAsEmployee.some((cycle) => !["CLOSED", "DECIDED"].includes(cycle.status));
    const completedThisMonth = u.cyclesAsEmployee.some((cycle) => ["CLOSED", "DECIDED"].includes(cycle.status));
    const eligibility = getAppraisalEligibility(u.joiningDate, now);
    return eligibility.eligible && !hasActive && !completedThisMonth;
  });

  const activeWithCycles = allUsers.filter((u) =>
    u.cyclesAsEmployee.some((cycle) => !["CLOSED", "DECIDED"].includes(cycle.status)),
  );

  const noCycleYet = allUsers.filter(
    (u) =>
      !u.cyclesAsEmployee.some((cycle) => !["CLOSED", "DECIDED"].includes(cycle.status)) &&
      !dueThisMonth.some((due) => due.id === u.id),
  );

  const calendarCycles = activeCycles.map((c) => ({
    employeeId: c.userId,
    employeeName: toTitleCase(c.user.name),
    cycleId: c.id,
    status: c.status,
    type: c.type,
    startDate: c.startDate.toISOString(),
  }));

  // All users as serialisable rows for the month filter component
  const allRows = allUsers.map((u) => ({
    id: u.id,
    name: toTitleCase(u.name),
    employeeNumber: u.employeeNumber,
    department: u.department,
    joiningDate: u.joiningDate.toISOString(),
    grossAnnum: u.salary ? Number(u.salary.grossAnnum) : null,
    cycle: (() => {
      const activeCycle = u.cyclesAsEmployee.find((cycle) => !["CLOSED", "DECIDED"].includes(cycle.status));
      return activeCycle
      ? {
          id: activeCycle.id,
          type: activeCycle.type,
          status: activeCycle.status,
          startDate: activeCycle.startDate.toISOString(),
        }
      : null;
    })(),
    eligible: getAppraisalEligibility(u.joiningDate, now).eligible,
    cycleType: autoCycleType(u.joiningDate, now),
  }));

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="ds-h1">Appraisal Assignments</h1>
          <p className="ds-body mt-1">
            {now.toLocaleString("default", { month: "long", year: "numeric" })}
          </p>
        </div>
      </FadeIn>

      {/* Top row: stats + calendar side by side */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Stats + month filter */}
        <div className="flex-1 min-w-0 space-y-4">
          <StaggerList className="grid grid-cols-3 gap-4">
            {[
              { label: "Due This Month", value: dueThisMonth.length, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
              { label: "Active Cycles", value: activeWithCycles.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
              { label: "No Active Cycle", value: noCycleYet.length, icon: Users, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800" },
            ].map((s) => (
              <StaggerItem key={s.label}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className={`inline-flex rounded-lg p-2 ${s.bg} mb-3`}>
                      <s.icon className={`size-5 ${s.color}`} />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>

          {/* Month filter */}
          <FadeIn delay={0.1}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="size-4 text-[#008993]" /> Filter by Joining Month
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <AppraisalsMonthFilter rows={allRows} />
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* Calendar */}
        <FadeIn delay={0.08}>
          <div className="lg:w-80 shrink-0 sticky top-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="size-4 text-[#008993]" /> Appraisal Calendar
                  <span className="text-xs font-normal text-slate-400">({activeCycles.length} active)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <AppraisalCalendar cycles={calendarCycles} />
              </CardContent>
            </Card>
          </div>
        </FadeIn>
      </div>

      {/* Tables full width below */}
      <div className="space-y-5">
        {dueThisMonth.length > 0 && (
          <FadeIn delay={0.15}>
            <Card className="border-0 shadow-sm border-l-4 border-l-blue-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-blue-600">
                  Due This Month ({dueThisMonth.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <AppraisalTableHead />
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dueThisMonth.map((u) => (
                        <AppraisalRow key={u.id} u={u} now={now} showDue />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        <FadeIn delay={0.2}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Cycles ({activeWithCycles.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <AppraisalTableHead />
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeWithCycles.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">No active cycles</td></tr>
                    ) : (
                      activeWithCycles.map((u) => <AppraisalRow key={u.id} u={u} now={now} />)
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.25}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-400">All Others — No Active Cycle ({noCycleYet.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <AppraisalTableHead />
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {noCycleYet.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">All employees have active cycles</td></tr>
                    ) : (
                      noCycleYet.map((u) => <AppraisalRow key={u.id} u={u} now={now} />)
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

function RowAssignLink({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      className="absolute inset-0 z-20"
      aria-label={`Open appraisal assignment for ${toTitleCase(name)}`}
    />
  );
}

function AppraisalTableHead() {
  return (
    <thead>
      <tr className="text-left border-b border-border bg-muted/40">
        <th className="py-2.5 px-4 ds-label">Emp #</th>
        <th className="px-4 ds-label">Name</th>
        <th className="px-4 ds-label">Department</th>
        <th className="px-4 ds-label">Joining</th>
        <th className="px-4 ds-label">Gross/mo</th>
        <th className="px-4 ds-label">Cycle</th>
      </tr>
    </thead>
  );
}

function AppraisalRow({
  u,
  now,
  showDue,
}: {
  u: {
    id: string;
    name: string;
    employeeNumber: number | null;
    department: string | null;
    joiningDate: Date;
    salary: { grossAnnum: unknown } | null;
    cyclesAsEmployee: Array<{ id: string; type: string; status: string }>;
  };
  now: Date;
  showDue?: boolean;
}) {
  const cycle = u.cyclesAsEmployee.find((c) => !["CLOSED", "DECIDED"].includes(c.status));
  const cycleType = autoCycleType(u.joiningDate, now);
  const gross = u.salary ? Number(u.salary.grossAnnum) : null;
  const href = `/workspace/hrms/employees/${u.id}/assign`;

  return (
    <tr className="hover:bg-muted/30 transition-colors cursor-pointer group/row">
      {/* Stretched link covers entire row */}
      <td className="py-3 px-4 text-muted-foreground font-mono text-xs relative">
        <RowAssignLink href={href} name={u.name} />
        {u.employeeNumber ?? "—"}
      </td>
      <td className="px-4 relative">
        <RowAssignLink href={href} name={u.name} />
        <span className="font-semibold text-foreground group-hover/row:text-primary transition-colors">
          {toTitleCase(u.name)}
        </span>
      </td>
      <td className="px-4 text-muted-foreground text-xs relative">
        <RowAssignLink href={href} name={u.name} />
        {u.department ?? "—"}
      </td>
      <td className="px-4 text-muted-foreground font-mono text-xs relative">
        <RowAssignLink href={href} name={u.name} />
        {u.joiningDate.toLocaleDateString()}
      </td>
      <td className="px-4 text-muted-foreground text-xs relative">
        <RowAssignLink href={href} name={u.name} />
        {gross ? `₹${Math.round(gross / 12).toLocaleString()}/mo` : "—"}
      </td>
      <td className="px-4 relative">
        <RowAssignLink href={href} name={u.name} />
        {cycle ? (
          <span className="ds-badge ds-badge-cyan">
            {cycle.type} · {cycle.status.replace(/_/g, " ")}
          </span>
        ) : showDue ? (
          <span className="ds-badge ds-badge-teal">
            {cycleType} due →
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50 group-hover/row:text-primary transition-colors">None →</span>
        )}
      </td>
    </tr>
  );
}
