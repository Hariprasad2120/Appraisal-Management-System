import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import Link from "next/link";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import {
  Clock,
  CalendarCheck,
  AlertCircle,
  TrendingDown,
  ChevronRight,
  Layers,
  Calendar,
  ClipboardList,
  FileText,
} from "lucide-react";

function ArrowUpRight() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export default async function OtDashboard() {
  const session = await auth();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  const [pendingCount, approvedOt, totalCompOff, currentLop] = await Promise.all([
    prisma.employeeOt.count({ where: { approvalStatus: "PENDING" } }),
    prisma.employeeOt.aggregate({
      where: {
        approvalStatus: "APPROVED",
        attendanceDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { otAmount: true, otHours: true },
    }),
    prisma.employeeOt.aggregate({
      where: {
        approvalStatus: "APPROVED",
        attendanceDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { compOffDays: true },
    }),
    prisma.employeeLop.aggregate({
      where: { payrollMonth: monthStart },
      _sum: { lopDays: true },
    }),
  ]);

  const totalOtAmount = Number(approvedOt._sum.otAmount ?? 0);
  const totalOtHours = Number(approvedOt._sum.otHours ?? 0);
  const totalCompOffDays = Number(totalCompOff._sum.compOffDays ?? 0);
  const totalLopDays = Number(currentLop._sum.lopDays ?? 0);

  const stats = [
    {
      label: "Total OT Amount",
      value: `â‚¹${totalOtAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      sub: `${totalOtHours.toFixed(1)} hrs approved`,
      href: "/attendance/records",
      icon: Clock,
      accent: "stat-teal",
      iconColor: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-50 dark:bg-teal-900/20",
    },
    {
      label: "Pending Approvals",
      value: pendingCount,
      sub: "awaiting review",
      href: "/attendance/records",
      icon: AlertCircle,
      accent: "stat-orange",
      iconColor: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      label: "Comp-Off Balance",
      value: totalCompOffDays.toFixed(1),
      sub: "days this month",
      href: "/attendance/records",
      icon: CalendarCheck,
      accent: "stat-cyan",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      iconBg: "bg-cyan-50 dark:bg-cyan-900/20",
    },
    {
      label: "LOP Days",
      value: totalLopDays.toFixed(1),
      sub: "loss of pay this month",
      href: "/attendance/lop",
      icon: TrendingDown,
      accent: "stat-amber",
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ];

  const quickLinks = [
    { href: "/attendance/import", label: "Attendance Import", desc: "Add attendance logs", icon: ClipboardList },
    { href: "/attendance/holidays", label: "Holiday Manager", desc: "Manage holiday calendar", icon: Calendar },
    { href: "/attendance/records", label: "OT Records", desc: "Approve / reject OT", icon: Layers },
    { href: "/attendance/lop", label: "LOP Manager", desc: "Manage LOP entries", icon: TrendingDown },
    { href: "/attendance/payroll", label: "Final Payroll", desc: "Monthly summary & export", icon: FileText },
    { href: "/attendance/settings", label: "OT Settings", desc: "Configure rates & slabs", icon: AlertCircle },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <FadeIn>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="ds-h1">OT & Comp-Off Management</h1>
            <p className="ds-body mt-1">{monthLabel} â€” Overtime, Comp-Off, and Payroll Adjustments</p>
          </div>
          <Link
            href="/attendance/import"
            className="inline-flex items-center gap-2 text-xs bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 px-3 py-2 rounded-xl hover:bg-teal-100 transition-colors"
          >
            <Clock className="size-3.5" />
            Import Attendance
          </Link>
        </div>
      </FadeIn>

      {/* Stat cards */}
      <StaggerList className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StaggerItem key={s.label}>
            <Link
              href={s.href}
              className={`block h-full bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 ${s.accent}`}
            >
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
              <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerList>

      {/* Quick links */}
      <FadeIn delay={0.2}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Quick Access</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className="block group bg-card">
                <div className="p-4 hover:bg-muted/40 transition-colors h-full flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {item.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{item.desc}</div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/40 ml-auto shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* How it works */}
      <FadeIn delay={0.3}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <span className="text-sm font-semibold text-foreground">How the OT Engine Works</span>
          </div>
          <div className="px-5 py-4 grid gap-4 sm:grid-cols-3 text-sm">
            <div className="space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <span className="size-5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs flex items-center justify-center font-bold">1</span>
                Import Attendance
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">Upload biometric check-in/check-out data. Total hours are auto-calculated.</p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <span className="size-5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-xs flex items-center justify-center font-bold">2</span>
                Process OT
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">Run the engine for a month. It checks holidays, weekends, and calculates OT hours / comp-off days automatically.</p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <span className="size-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center font-bold">3</span>
                Approve & Export
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">Review and approve OT records. Generate the final payroll summary with LOP deductions and export as CSV.</p>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

