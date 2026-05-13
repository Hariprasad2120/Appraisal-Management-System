import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import { FileText, CalendarDays, Users } from "lucide-react";
import { startOfWeek, format, subWeeks } from "date-fns";
import { submitWorkReportAction, updateWorkReportAction } from "./actions";

function weekLabel(date: Date) {
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  return `${format(date, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
}

export default async function WorkReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const userId = session.user.id;
  const role = session.user.role;

  const isManagerial = ["ADMIN", "MANAGEMENT", "TL", "MANAGER"].includes(role);
  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

  const myReports = await prisma.workReport.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: 12,
  });

  const teamReports = isManagerial
    ? await prisma.workReport.findMany({
        where: {
          organizationId,
          weekStart: { gte: subWeeks(thisWeek, 4) },
          userId: { not: userId },
        },
        orderBy: [{ weekStart: "desc" }, { submittedAt: "desc" }],
        include: { user: { select: { id: true, name: true, designation: true } } },
      })
    : [];

  const thisWeekReport = myReports.find(
    (r) => r.weekStart.getTime() === thisWeek.getTime()
  );

  return (
    <FadeIn>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <Breadcrumbs items={[{ label: "Work Reports" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">Work Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Weekly summary of your work</p>
        </div>

        {/* This week's report */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              {thisWeekReport ? `This week · ${weekLabel(thisWeek)}` : `Submit report · ${weekLabel(thisWeek)}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {thisWeekReport ? (
              <form action={updateWorkReportAction} className="space-y-4">
                <input type="hidden" name="id" value={thisWeekReport.id} />
                <ReportFields defaults={thisWeekReport} />
                <Button type="submit" size="sm">Update Report</Button>
              </form>
            ) : (
              <form action={submitWorkReportAction} className="space-y-4">
                <ReportFields />
                <Button type="submit" size="sm">Submit Report</Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Past reports */}
        {myReports.length > (thisWeekReport ? 1 : 0) && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" /> Past Reports
            </h2>
            <div className="space-y-3">
              {myReports
                .filter((r) => r.weekStart.getTime() !== thisWeek.getTime())
                .map((r) => (
                  <details key={r.id} className="rounded-xl border border-border bg-card">
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground select-none">
                      <span>{weekLabel(r.weekStart)}</span>
                      <span className="text-xs text-muted-foreground">
                        Submitted {format(r.submittedAt, "dd MMM HH:mm")}
                      </span>
                    </summary>
                    <div className="border-t border-border px-4 py-3 space-y-2 text-sm text-muted-foreground">
                      <ReportReadView report={r} />
                    </div>
                  </details>
                ))}
            </div>
          </div>
        )}

        {/* Team reports (managerial roles) */}
        {isManagerial && teamReports.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" /> Team Reports (Last 4 Weeks)
            </h2>
            <div className="space-y-3">
              {teamReports.map((r) => (
                <details key={r.id} className="rounded-xl border border-border bg-card">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm select-none">
                    <div>
                      <span className="font-medium text-foreground">{r.user.name}</span>
                      {r.user.designation && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {r.user.designation}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{weekLabel(r.weekStart)}</span>
                  </summary>
                  <div className="border-t border-border px-4 py-3 space-y-2 text-sm text-muted-foreground">
                    <ReportReadView report={r} />
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {myReports.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No work reports submitted yet.
            </CardContent>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}

function ReportFields({ defaults }: { defaults?: { summary: string; accomplishments: string | null; blockers: string | null; nextWeek: string | null } }) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Summary *</label>
        <textarea
          name="summary"
          required
          defaultValue={defaults?.summary ?? ""}
          rows={3}
          placeholder="What did you work on this week?"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Accomplishments</label>
        <textarea
          name="accomplishments"
          defaultValue={defaults?.accomplishments ?? ""}
          rows={2}
          placeholder="Key wins and completed items"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Blockers</label>
        <textarea
          name="blockers"
          defaultValue={defaults?.blockers ?? ""}
          rows={2}
          placeholder="Any impediments or issues"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Plan for next week</label>
        <textarea
          name="nextWeek"
          defaultValue={defaults?.nextWeek ?? ""}
          rows={2}
          placeholder="What will you focus on next week?"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </>
  );
}

function ReportReadView({ report }: { report: { summary: string; accomplishments: string | null; blockers: string | null; nextWeek: string | null } }) {
  return (
    <div className="space-y-2">
      <div>
        <span className="font-medium text-foreground text-xs">Summary</span>
        <p className="mt-0.5 whitespace-pre-wrap">{report.summary}</p>
      </div>
      {report.accomplishments && (
        <div>
          <span className="font-medium text-foreground text-xs">Accomplishments</span>
          <p className="mt-0.5 whitespace-pre-wrap">{report.accomplishments}</p>
        </div>
      )}
      {report.blockers && (
        <div>
          <span className="font-medium text-foreground text-xs">Blockers</span>
          <p className="mt-0.5 whitespace-pre-wrap">{report.blockers}</p>
        </div>
      )}
      {report.nextWeek && (
        <div>
          <span className="font-medium text-foreground text-xs">Next week plan</span>
          <p className="mt-0.5 whitespace-pre-wrap">{report.nextWeek}</p>
        </div>
      )}
    </div>
  );
}
