import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { toTitleCase } from "@/lib/utils";
import { IndianRupee, TrendingUp, Users, CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function SalaryRevisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ emp?: string; status?: string; sort?: string }>;
}) {
  const { emp, status, sort } = await searchParams;

  const byDate = sort === "date";

  const revisions = await prisma.salaryRevision.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(emp ? { user: { employeeNumber: Number(emp) } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          department: true,
          designation: true,
        },
      },
    },
    orderBy: byDate
      ? [{ effectiveFrom: "desc" }, { user: { employeeNumber: "asc" } }]
      : [{ user: { employeeNumber: "asc" } }, { effectiveFrom: "desc" }],
  });

  const totalApproved = revisions.filter((r) => r.status === "Approved").length;
  const totalPending = revisions.filter((r) => r.status === "Pending").length;
  const totalRejected = revisions.filter((r) => r.status === "Rejected").length;
  const uniqueEmps = new Set(revisions.map((r) => r.userId)).size;

  const fmt = (n: number) => `â‚¹${n.toLocaleString("en-IN")}`;
  const fmtMonth = (d: Date) =>
    d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  const statusBadge: Record<string, string> = {
    Approved: "ds-badge ds-badge-green",
    Pending: "ds-badge ds-badge-amber",
    Rejected: "ds-badge ds-badge-red",
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Salary", href: "/hrms/salary" }, { label: "Revisions" }]} />
          <h1 className="ds-h1 mt-1">Salary Revisions</h1>
          <p className="ds-body mt-1">
            {revisions.length} revision{revisions.length !== 1 ? "s" : ""}{" "}
            across {uniqueEmps} employee{uniqueEmps !== 1 ? "s" : ""}
          </p>
        </div>
      </FadeIn>

      {/* Summary cards */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Revisions",
              value: revisions.length,
              icon: IndianRupee,
              iconColor: "text-primary",
              iconBg: "bg-primary/10",
              accent: "stat-teal",
            },
            {
              label: "Employees",
              value: uniqueEmps,
              icon: Users,
              iconColor: "text-blue-400",
              iconBg: "bg-blue-500/10",
              accent: "stat-cyan",
            },
            {
              label: "Approved",
              value: totalApproved,
              icon: CheckCircle,
              iconColor: "text-green-500",
              iconBg: "bg-green-500/10",
              accent: "stat-green",
            },
            {
              label: "Pending",
              value: totalPending,
              icon: TrendingUp,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10",
              accent: "stat-amber",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-card border border-border rounded-xl p-4 shadow-sm ${s.accent}`}
            >
              <div
                className={`inline-flex rounded-[8px] p-1.5 ${s.iconBg} mb-2`}
              >
                <s.icon className={`size-4 ${s.iconColor}`} />
              </div>
              <div className="ds-stat text-2xl">{s.value}</div>
              <div className="ds-small mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Filter bar */}
      <FadeIn delay={0.08}>
        <div className="flex flex-wrap gap-2 text-xs items-center">
          {["", "Approved", "Pending", "Rejected"].map((s) => {
            const params = new URLSearchParams();
            if (s) params.set("status", s);
            if (emp) params.set("emp", emp);
            if (byDate) params.set("sort", "date");
            const href = `/workspace/hrms/salary/revisions${params.toString() ? `?${params}` : ""}`;
            return (
              <Link
                key={s || "all"}
                href={href}
                className={`px-3 py-1.5 rounded-full border transition-colors ${
                  (status ?? "") === s
                    ? "bg-[#008993] text-white border-[#008993]"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#008993] hover:text-[#008993]"
                }`}
              >
                {s || "All"}
              </Link>
            );
          })}

          <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Sort toggle */}
          {(() => {
            const params = new URLSearchParams();
            if (status) params.set("status", status);
            if (emp) params.set("emp", emp);
            if (!byDate) params.set("sort", "date");
            return (
              <Link
                href={`/workspace/hrms/salary/revisions${params.toString() ? `?${params}` : ""}`}
                className={`px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                  byDate
                    ? "bg-[#ff8333] text-white border-[#ff8333]"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#ff8333] hover:text-[#ff8333]"
                }`}
              >
                {byDate ? "â†“ By Date" : "â†• By Emp #"}
              </Link>
            );
          })()}

          {emp && (
            <Link
              href="/hrms/salary/revisions"
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-400 hover:text-red-500 transition-colors"
            >
              Clear filter Ã—
            </Link>
          )}
        </div>
      </FadeIn>

      {/* Main table */}
      <FadeIn delay={0.1}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Revision Records ({revisions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-border bg-muted/40">
                    <th className="py-2.5 px-4 ds-label">Emp #</th>
                    <th className="px-4 ds-label">Name</th>
                    <th className="px-4 ds-label">Department</th>
                    <th className="px-4 ds-label">
                      {byDate ? "â†“ " : ""}Effective
                    </th>
                    <th className="px-4 ds-label">Revised CTC</th>
                    <th className="px-4 ds-label">Rev %</th>
                    <th className="px-4 ds-label">Status</th>
                    <th className="px-4 ds-label">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {revisions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-muted-foreground/50 ds-small"
                      >
                        No revision records found.
                      </td>
                    </tr>
                  ) : (
                    revisions.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-muted/30 transition-colors group/row"
                      >
                        <td className="py-2.5 px-4 text-muted-foreground font-mono">
                          {r.user.employeeNumber ?? "â€”"}
                        </td>
                        <td className="px-4 font-semibold text-foreground whitespace-nowrap">
                          <Link
                            href={`/workspace/hrms/employees/${r.user.id}/assign`}
                            className="transition-colors hover:text-primary hover:underline"
                          >
                            {toTitleCase(r.user.name)}
                          </Link>
                        </td>
                        <td className="px-4 text-muted-foreground whitespace-nowrap">
                          {r.user.department ?? "â€”"}
                        </td>
                        <td className="px-4 text-muted-foreground font-mono whitespace-nowrap">
                          {fmtMonth(r.effectiveFrom)}
                        </td>
                        <td className="px-4 font-semibold text-foreground">
                          {fmt(Number(r.revisedCtc))}
                        </td>
                        <td className="px-4">
                          {r.revisionPercentage ? (
                            <span
                              className={`font-medium font-mono ${Number(r.revisionPercentage) >= 0 ? "text-green-500" : "text-red-400"}`}
                            >
                              {Number(r.revisionPercentage) >= 0 ? "+" : ""}
                              {Number(r.revisionPercentage)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">â€”</span>
                          )}
                        </td>
                        <td className="px-4">
                          <span
                            className={
                              statusBadge[r.status] ?? "ds-badge ds-badge-gray"
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4">
                          <Link
                            href={`/workspace/hrms/employees/${r.user.id}`}
                            className="text-primary hover:underline font-medium whitespace-nowrap text-xs"
                          >
                            View employee â†’
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {totalRejected > 0 && (
        <FadeIn delay={0.15}>
          <p className="text-xs text-slate-400 text-center">
            {totalRejected} rejected revision{totalRejected !== 1 ? "s" : ""}{" "}
            hidden from approved count.
          </p>
        </FadeIn>
      )}
    </div>
  );
}

