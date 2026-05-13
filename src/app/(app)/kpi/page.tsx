import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { monthStart } from "@/lib/kpi";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import { BarChart3, Star, CheckCircle, Clock, RotateCcw, PauseCircle } from "lucide-react";

export default async function KpiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const userId = session.user.id;
  const role = session.user.role;

  const currentMonth = monthStart(new Date());
  const [currentKpi, historicalKpis] = await Promise.all([
    prisma.kpiReview.findFirst({
      where: { organizationId, userId, month: currentMonth },
      include: {
        department: { select: { name: true } },
        kpiTasks: { select: { status: true } },
      },
    }),
    prisma.kpiReview.findMany({
      where: { organizationId, userId },
      orderBy: { month: "desc" },
      take: 6,
      select: { id: true, month: true, monthlyPointScore: true, averageRating: true },
    }),
  ]);

  const kpiTasks = currentKpi?.kpiTasks ?? [];
  const kpiSummary = {
    currentScore: currentKpi?.monthlyPointScore ?? 0,
    averageRating: currentKpi?.averageRating ?? 0,
    completedTasks: kpiTasks.filter((t) => t.status === "CLOSED").length,
    pendingReview: kpiTasks.filter((t) => t.status === "WAITING_REVIEW").length,
    reopenedTasks: kpiTasks.filter((t) => t.status === "REOPENED").length,
    pausedTasks: kpiTasks.filter((t) => t.status === "PAUSED").length,
  };

  const isManagerial = ["ADMIN", "MANAGEMENT", "TL", "MANAGER"].includes(role);

  return (
    <FadeIn>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Breadcrumbs items={[{ label: "KPI" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">KPI</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentKpi
                ? `${currentKpi.department.name} · ${currentKpi.month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`
                : "Current month KPI summary"}
            </p>
          </div>
          {isManagerial && (
            <Link href={role === "TL" ? "/reviewer/kpi" : "/admin/kpi"}>
              <Button variant="outline" size="sm">
                {role === "TL" ? "Team KPI" : "Department KPI"}
              </Button>
            </Link>
          )}
        </div>

        {/* Summary cards */}
        <StaggerList className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Current Month Score", value: kpiSummary.currentScore.toLocaleString("en-IN"), icon: BarChart3, tone: "stat-teal" },
            { label: "Average Rating", value: kpiSummary.averageRating.toFixed(2), icon: Star, tone: "stat-amber" },
            { label: "Completed Tasks", value: String(kpiSummary.completedTasks), icon: CheckCircle, tone: "stat-green" },
            { label: "Pending TL Review", value: String(kpiSummary.pendingReview), icon: Clock, tone: "stat-cyan" },
            { label: "Reopened Tasks", value: String(kpiSummary.reopenedTasks), icon: RotateCcw, tone: "stat-orange" },
            { label: "Paused Tasks", value: String(kpiSummary.pausedTasks), icon: PauseCircle, tone: "stat-red" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <StaggerItem key={card.label}>
                <div className={`rounded-xl border border-border bg-card p-4 shadow-sm ${card.tone}`}>
                  <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{card.value}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{card.label}</p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>

        {/* KPI history */}
        {historicalKpis.length > 1 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">KPI History</h2>
            <div className="space-y-2">
              {historicalKpis.slice(1).map((review) => (
                <div key={review.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    {review.month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </span>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-xs text-muted-foreground">Score</div>
                      <div className="font-semibold text-foreground">{review.monthlyPointScore.toLocaleString("en-IN")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                      <div className="font-semibold text-foreground">{Number(review.averageRating ?? 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!currentKpi && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No KPI data assigned for the current month.
            </CardContent>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}
