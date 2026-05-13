import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { computeCycleStatus, allReviewersAvailable, isSelfAssessmentSubmitted } from "@/lib/workflow";
import { getSystemDate } from "@/lib/system-date";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import { Star, Clock, CheckCircle, Circle, ChevronRight } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING_SELF: "Self-Assessment Pending",
  SELF_SUBMITTED: "Self-Assessment Submitted",
  AWAITING_AVAILABILITY: "Reviewers Confirming Availability",
  RATING_IN_PROGRESS: "Rating In Progress",
  RATINGS_COMPLETE: "Ratings Complete",
  MANAGEMENT_REVIEW: "Management Review",
  DATE_VOTING: "Scheduling Meeting",
  SCHEDULED: "Meeting Scheduled",
  DECIDED: "Decision Finalised",
  CLOSED: "Closed",
};

export default async function MyAppraisalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { tab = "current" } = await searchParams;
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const userId = session.user.id;
  const role = session.user.role;

  const cycles = await prisma.appraisalCycle.findMany({
    where: { organizationId, userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      self: true,
      assignments: {
        include: { reviewer: { select: { id: true, name: true } } },
      },
      ratings: true,
      decision: { include: { slab: true } },
      moms: { where: { role: "MANAGEMENT" } },
    },
  });

  const cycle = cycles[0] ?? null;
  const now = await getSystemDate();
  const displayStatus = cycle
    ? computeCycleStatus(
        { id: cycle.id, status: cycle.status, ratingDeadline: cycle.ratingDeadline, self: cycle.self, assignments: cycle.assignments, ratings: cycle.ratings },
        now,
      )
    : null;
  const allAvailable = cycle ? allReviewersAvailable(cycle.assignments) : false;
  const selfSubmitted = cycle?.self ? isSelfAssessmentSubmitted(cycle.self) : false;
  const totalReviewers = cycle?.assignments.length ?? 0;
  const ratedCount = cycle?.ratings.length ?? 0;

  const isAdminRole = ["ADMIN", "MANAGEMENT", "PARTNER"].includes(role);

  return (
    <FadeIn>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <Breadcrumbs items={[{ label: "My Appraisal" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">My Appraisal</h1>
          <p className="text-sm text-muted-foreground mt-1">{cycles.length} total cycle{cycles.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 border-b border-border pb-0">
          {["current", "history"].map((t) => (
            <Link
              key={t}
              href={`/my-appraisal?tab=${t}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t === "current" ? "Current Cycle" : "History"}
            </Link>
          ))}
          {(role === "ADMIN" || isAdminRole) && (
            <Link
              href="/ams/admin/cycles"
              className="ml-auto self-end pb-2 text-xs text-primary hover:underline"
            >
              All org cycles →
            </Link>
          )}
        </div>

        {tab === "current" && (
          <div className="space-y-4">
            {!cycle ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No active appraisal cycle. Admin will initiate one near your anniversary.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="size-4 text-amber-500" /> {cycle.type} Cycle
                    </CardTitle>
                    <span className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1 font-medium border border-primary/20">
                      {STATUS_LABELS[displayStatus ?? ""] ?? displayStatus}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Reviewer availability */}
                  {cycle.assignments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reviewer Availability</p>
                      <div className="space-y-1">
                        {cycle.assignments.map((a) => (
                          <div key={a.id} className="flex items-center gap-2.5 py-1">
                            {a.availability === "AVAILABLE" ? (
                              <CheckCircle className="size-4 text-green-500 shrink-0" />
                            ) : a.availability === "NOT_AVAILABLE" ? (
                              <Circle className="size-4 text-red-400 shrink-0" />
                            ) : (
                              <Clock className="size-4 text-amber-400 shrink-0" />
                            )}
                            <span className="text-sm text-foreground flex-1">{a.reviewer.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                              a.availability === "AVAILABLE"
                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                : a.availability === "NOT_AVAILABLE"
                                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                            }`}>
                              {a.role} · {a.availability === "AVAILABLE" ? "Available" : a.availability === "NOT_AVAILABLE" ? "Not Available" : "Pending"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Self-assessment */}
                  {cycle.self && (
                    <div className={`rounded-xl p-4 border ${
                      selfSubmitted ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                        : allAvailable ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                        : "bg-muted border-border"
                    }`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className={`font-semibold text-sm ${
                            selfSubmitted ? "text-green-700 dark:text-green-400"
                              : allAvailable ? "text-amber-700 dark:text-amber-400"
                              : "text-muted-foreground"
                          }`}>
                            Self-Assessment — {selfSubmitted ? "Submitted" : allAvailable ? "Pending" : "Locked (awaiting reviewers)"}
                          </p>
                          {!selfSubmitted && allAvailable && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                              Deadline: {cycle.self.editableUntil.toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                        {allAvailable && (
                          <Link href={`/employee/self/${cycle.id}`}>
                            <Button size="sm" variant={selfSubmitted ? "outline" : "default"}>
                              {selfSubmitted ? "View" : "Start"} <ChevronRight className="size-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rating progress */}
                  {totalReviewers > 0 && allAvailable && selfSubmitted && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rating Progress</p>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(ratedCount / totalReviewers) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {ratedCount} / {totalReviewers} rated
                      </p>
                    </div>
                  )}

                  {/* Decision */}
                  {cycle.decision && cycle.moms.length > 0 && (
                    <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Final Decision</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Slab</div>
                          <div className="font-bold text-foreground">{cycle.decision.slab?.label ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Increment</div>
                          <div className="font-bold text-green-600 dark:text-green-400">
                            +₹{Number(cycle.decision.finalAmount).toLocaleString("en-IN")}/yr
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {cycles.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">No appraisal history yet.</CardContent>
              </Card>
            ) : (
              cycles.map((c) => (
                <Card key={c.id}>
                  <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{c.type} · {new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.status}</p>
                    </div>
                    <Link href={`/employee/self/${c.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                      View <ChevronRight className="size-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </FadeIn>
  );
}
