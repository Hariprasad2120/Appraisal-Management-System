import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { getAppraisalEligibility, autoCycleType } from "@/lib/appraisal-eligibility";
import { ChevronRight, Calendar, Users, Clock, CalendarDays } from "lucide-react";
import { AppraisalCalendar } from "@/components/appraisal-calendar";
import { AppraisalsMonthFilter } from "./appraisals-month-filter";

export default async function AppraisalsPage() {
  const now = new Date();

  const [allUsers, activeCycles] = await Promise.all([
    prisma.user.findMany({
      where: { role: { notIn: ["MANAGEMENT", "PARTNER"] }, active: true },
      orderBy: { name: "asc" },
      include: {
        salary: { select: { grossAnnum: true } },
        cyclesAsEmployee: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, type: true, status: true, startDate: true },
        },
      },
    }),
    prisma.appraisalCycle.findMany({
      where: { status: { notIn: ["CLOSED", "DECIDED"] } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const dueThisMonth = allUsers.filter((u) => {
    const hasActive = u.cyclesAsEmployee.length > 0;
    const eligibility = getAppraisalEligibility(u.joiningDate, now);
    return eligibility.eligible && !hasActive;
  });

  const activeWithCycles = allUsers.filter((u) => u.cyclesAsEmployee.length > 0);

  const noCycleYet = allUsers.filter(
    (u) => u.cyclesAsEmployee.length === 0 && !getAppraisalEligibility(u.joiningDate, now).eligible,
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
    cycle: u.cyclesAsEmployee[0]
      ? {
          id: u.cyclesAsEmployee[0].id,
          type: u.cyclesAsEmployee[0].type,
          status: u.cyclesAsEmployee[0].status,
          startDate: u.cyclesAsEmployee[0].startDate.toISOString(),
        }
      : null,
    eligible: getAppraisalEligibility(u.joiningDate, now).eligible,
    cycleType: autoCycleType(u.joiningDate, now),
  }));

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Appraisal Assignments</h1>
          <p className="text-slate-500 text-sm mt-1">
            {now.toLocaleString("default", { month: "long", year: "numeric" })}
          </p>
        </div>
      </FadeIn>

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

      {/* Calendar + Month filter layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left: tables */}
        <div className="flex-1 min-w-0 space-y-5">
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

        {/* Right: calendar */}
        <FadeIn delay={0.1}>
          <div className="lg:w-80 shrink-0 sticky top-4 space-y-4">
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

            {/* Month filter card */}
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
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

function AppraisalTableHead() {
  return (
    <thead>
      <tr className="text-left text-xs text-slate-500 border-b bg-slate-50 dark:bg-slate-800/50">
        <th className="py-3 px-4 font-medium">Emp #</th>
        <th className="px-4 font-medium">Name</th>
        <th className="px-4 font-medium">Department</th>
        <th className="px-4 font-medium">Joining</th>
        <th className="px-4 font-medium">Gross/mo</th>
        <th className="px-4 font-medium">Cycle</th>
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
  const cycle = u.cyclesAsEmployee[0];
  const cycleType = autoCycleType(u.joiningDate, now);
  const gross = u.salary ? Number(u.salary.grossAnnum) : null;

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="py-3 px-4 text-slate-500 text-xs">{u.employeeNumber ?? "—"}</td>
      <td className="px-4">
        <Link
          href={`/admin/employees/${u.id}/assign`}
          className="font-medium text-slate-900 dark:text-white hover:text-[#008993] transition-colors"
        >
          {toTitleCase(u.name)}
        </Link>
      </td>
      <td className="px-4 text-slate-500 text-xs">{u.department ?? "—"}</td>
      <td className="px-4 text-slate-500 text-xs">{u.joiningDate.toLocaleDateString()}</td>
      <td className="px-4 text-slate-600 text-xs">
        {gross ? `₹${Math.round(gross / 12).toLocaleString()}/mo` : "—"}
      </td>
      <td className="px-4">
        <Link href={`/admin/employees/${u.id}/assign`} className="inline-flex items-center gap-1.5 group/cycle">
          {cycle ? (
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 rounded-full px-2 py-0.5 group-hover/cycle:bg-[#008993] group-hover/cycle:text-white transition-colors">
              {cycle.type} · {cycle.status.replace(/_/g, " ")}
            </span>
          ) : showDue ? (
            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 rounded-full px-2 py-0.5 group-hover/cycle:bg-[#008993] group-hover/cycle:text-white transition-colors">
              {cycleType} due
            </span>
          ) : (
            <span className="text-xs text-slate-400 group-hover/cycle:text-[#008993] transition-colors">None →</span>
          )}
          {(cycle || showDue) && <ChevronRight className="size-3 text-slate-400 group-hover/cycle:text-[#008993] transition-colors" />}
        </Link>
      </td>
    </tr>
  );
}
