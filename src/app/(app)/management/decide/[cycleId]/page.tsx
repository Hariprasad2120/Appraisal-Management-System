import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { DecisionForm } from "./decision-form";
import { HikeEditForm } from "./hike-edit-form";
import { CheckCircle, FileText, Calendar, Pencil } from "lucide-react";
import { CRITERIA_CATEGORIES, getCriteriaForRole, getSalaryTier } from "@/lib/criteria";
import { auth } from "@/lib/auth";
import { ClaimPanel } from "./claim-panel";

export default async function DecidePage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const session = await auth();
  const actorId = session?.user?.id ?? null;
  const actorRole = session?.user?.role ?? null;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      user: { include: { salary: true } },
      self: true,
      ratings: {
        include: {
          reviewer: { select: { name: true, role: true } },
          ratingReviews: true,
          disagreement: true,
        },
      },
      decision: { include: { slab: true } },
      assignments: { include: { reviewer: { select: { name: true } } } },
      claimedBy: { select: { id: true, name: true } },
      ratingReviews: {
        include: { reviewer: { select: { name: true, role: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!cycle) notFound();

  const slabs = await prisma.incrementSlab.findMany({ orderBy: { minRating: "desc" } });

  const avg = cycle.ratings.length > 0
    ? cycle.ratings.reduce((s, r) => s + r.averageScore, 0) / cycle.ratings.length
    : 0;

  const grossAnnum = cycle.user.salary ? Number(cycle.user.salary.grossAnnum) : 0;
  const monthlyGross = grossAnnum ? grossAnnum / 12 : 0;
  const tierKey = monthlyGross ? getSalaryTier(monthlyGross) : null;
  const dbTier =
    tierKey === "upto15k" ? "UPTO_15K" : tierKey === "upto30k" ? "BTW_15K_30K" : "ABOVE_30K";
  const suggestedSlab = slabs.find((s) => avg >= s.minRating && avg <= s.maxRating && (s.salaryTier === dbTier || s.salaryTier === "ALL"));

  // Build per-reviewer rating data with criteria breakdown
  const reviewerRatings = cycle.ratings.map((r) => {
    const scores = r.scores as Record<string, number>;
    const criteriaBreakdown = CRITERIA_CATEGORIES.map((cat) => ({
      name: cat.name,
      maxPoints: cat.maxPoints,
      score: scores[cat.name] ?? 0,
      revisedScore: r.ratingReviews.find((rv) => rv.criteriaName === cat.name)?.revisedScore ?? null,
      justification: r.ratingReviews.find((rv) => rv.criteriaName === cat.name)?.justification ?? null,
    }));
    return {
      id: r.id,
      role: r.role,
      reviewerName: toTitleCase(r.reviewer.name),
      averageScore: r.averageScore,
      comments: r.comments,
      postComment: r.postComment,
      criteriaBreakdown,
      hasRevisions: r.ratingReviews.length > 0,
      disagreement: r.disagreement
        ? {
            evaluation: r.disagreement.evaluation as string,
            comment: r.disagreement.comment,
            ceilingMin: r.disagreement.ceilingMin ? Number(r.disagreement.ceilingMin) : null,
            ceilingMax: r.disagreement.ceilingMax ? Number(r.disagreement.ceilingMax) : null,
            revisedScores: r.disagreement.revisedScores as Record<string, number> | null,
          }
        : null,
    };
  });

  // Self-assessment answers for display
  const selfAnswers = cycle.self?.answers as Record<string, { score: number; comment: string }> | null;

  // Self-score normalized 0-100 (sum of category scores / total max * 100)
  const selfRawScore = selfAnswers
    ? CRITERIA_CATEGORIES.filter((c) => !c.reviewerOnly).reduce(
        (s, c) => s + ((selfAnswers[c.name]?.score ?? 0) as number),
        0,
      )
    : 0;
  const selfMaxPoints = CRITERIA_CATEGORIES.filter((c) => !c.reviewerOnly).reduce(
    (s, c) => s + c.maxPoints,
    0,
  );
  const selfNormalizedScore = selfMaxPoints > 0 ? (selfRawScore / selfMaxPoints) * 100 : 0;

  // Criteria management can rate (excludes Accountability & Attendance, Organisational Contribution & Engagement)
  const mgmtCriteria = getCriteriaForRole(CRITERIA_CATEGORIES, "MANAGEMENT");

  const claimedByOther =
    !!cycle.claimedById && actorId && cycle.claimedById !== actorId && actorRole !== "ADMIN";

  return (
    <div className="space-y-5 max-w-5xl">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Finalize: {toTitleCase(cycle.user.name)}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 text-sm">
              {cycle.type} Appraisal · {cycle.user.department ?? "—"}
            </p>
            {cycle.self && cycle.self.editCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <FileText className="size-3" />
                Self-assessment edited {cycle.self.editCount}×
              </span>
            )}
          </div>
        </div>
      </FadeIn>

      {cycle.decision ? (
        <FadeIn delay={0.1}>
          <div className="space-y-4">
            <Card className="border-0 shadow-sm border-l-4 border-l-green-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-green-600">
                  <CheckCircle className="size-4" /> Appraisal Decided
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <div className="grid grid-cols-2 gap-2 max-w-sm">
                  <div className="text-slate-500">Final Rating</div>
                  <div className="font-semibold">{cycle.decision.finalRating.toFixed(2)}</div>
                  <div className="text-slate-500">Slab</div>
                  <div className="font-semibold">{cycle.decision.slab?.label ?? "—"}</div>
                  <div className="text-slate-500">Hike %</div>
                  <div className="font-semibold">{cycle.decision.slab?.hikePercent ?? "—"}%</div>
                  <div className="text-slate-500">Final Increment</div>
                  <div className="font-semibold text-green-600">₹{Number(cycle.decision.finalAmount).toLocaleString("en-IN")}/yr</div>
                  <div className="text-slate-500">Current Gross</div>
                  <div className="font-semibold">₹{grossAnnum.toLocaleString("en-IN")}/yr</div>
                  <div className="text-slate-500">New Gross</div>
                  <div className="font-semibold text-blue-600">₹{(grossAnnum + Number(cycle.decision.finalAmount)).toLocaleString("en-IN")}/yr</div>
                </div>
                {cycle.decision.comments && (
                  <div className="text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs">
                    {cycle.decision.comments}
                  </div>
                )}
                {/* Management can update hike% post-decision */}
                {(actorRole === "MANAGEMENT" || actorRole === "ADMIN") && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
                      <Pencil className="size-3" /> Adjust Hike Percentage
                    </div>
                    <HikeEditForm
                      cycleId={cycleId}
                      currentHikePercent={cycle.decision.slab?.hikePercent ?? 0}
                      grossAnnum={grossAnnum}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meeting schedule status */}
            <Card className="border-0 shadow-sm border-l-4 border-l-blue-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-600">
                  <Calendar className="size-4" /> Appraisal Meeting
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {cycle.scheduledDate ? (
                  <p className="text-green-600 font-medium">
                    Confirmed: {new Date(cycle.scheduledDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                ) : cycle.tentativeDate1 && cycle.tentativeDate2 ? (
                  <>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">Waiting for HR to confirm from proposed dates:</p>
                    <p className="text-xs font-medium">Option 1: {new Date(cycle.tentativeDate1).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</p>
                    <p className="text-xs font-medium">Option 2: {new Date(cycle.tentativeDate2).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</p>
                  </>
                ) : (
                  <p className="text-slate-400 text-xs">Tentative dates not yet proposed.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.1}>
          <div className="space-y-3">
            {!cycle.claimedById && <ClaimPanel cycleId={cycleId} />}

            {cycle.claimedById && (
              <Card className="border border-border shadow-sm bg-card">
                <CardContent className="p-3 text-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">Claim status</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Claimed by <span className="font-medium text-foreground">{toTitleCase(cycle.claimedBy?.name ?? "Unknown")}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {cycle.claimedAt ? new Date(cycle.claimedAt).toLocaleString("en-IN") : ""}
                  </div>
                </CardContent>
              </Card>
            )}

            {claimedByOther ? (
              <Card className="border border-border shadow-sm bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-foreground">Locked</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  This appraisal is claimed by another management user. You can view it from the dashboard,
                  but you can’t edit/finalize it.
                </CardContent>
              </Card>
            ) : (
              <DecisionForm
                cycleId={cycleId}
                reviewerAvgRating={avg}
                selfNormalizedScore={selfNormalizedScore}
                suggestedHikePercent={suggestedSlab?.hikePercent ?? 0}
                grossAnnum={grossAnnum}
                reviewerRatings={reviewerRatings}
                selfAnswers={selfAnswers}
                mgmtCriteria={mgmtCriteria.map((c) => ({ name: c.name, maxPoints: c.maxPoints, items: c.items }))}
                slabs={slabs.map((s) => ({ id: s.id, label: s.label, minRating: s.minRating, maxRating: s.maxRating, hikePercent: s.hikePercent, salaryTier: s.salaryTier }))}
                isAdmin={true}
              />
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
