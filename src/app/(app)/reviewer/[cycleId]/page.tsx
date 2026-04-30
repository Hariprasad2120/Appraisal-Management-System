import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  computeCycleStatus,
  getVisibleAverageForReviewer,
  isRatingOpen,
  isReviewWindowOpen,
} from "@/lib/workflow";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import { ExtensionRequestForm } from "./extension-request-form";
import { PostCommentForm } from "./post-comment-form";
import { RatingReviewForm } from "./rating-review-form";
import { RatingDisagreementForm } from "./rating-disagreement-form";
import {
  CheckCircle,
  Circle,
  ChevronRight,
  Star,
  FileText,
  ArrowLeft,
  User,
  Building2,
  CalendarDays,
} from "lucide-react";
import { CRITERIA_CATEGORIES } from "@/lib/criteria";
import { getSystemDate } from "@/lib/system-date";

export default async function ReviewerCycleView({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const assignment = await prisma.cycleAssignment.findFirst({
    where: { cycleId, reviewerId: session.user.id },
  });
  if (!assignment && session.user.role !== "ADMIN") notFound();

  const [cycle, existingExtension] = await Promise.all([
    prisma.appraisalCycle.findUnique({
      where: { id: cycleId },
      include: {
        user: true,
        self: true,
        ratings: { include: { reviewer: { select: { name: true } } } },
        assignments: { include: { reviewer: { select: { name: true } } } },
      },
    }),
    assignment
      ? prisma.extensionRequest.findFirst({
          where: { cycleId, requesterId: session.user.id, status: "PENDING" },
        })
      : null,
  ]);
  if (!cycle) notFound();

  const now = await getSystemDate();
  const reviewOpen = isReviewWindowOpen(cycle, now);
  const ratingOpen = isRatingOpen(cycle, now);
  const displayStatus = computeCycleStatus(cycle, now);
  const myRating = cycle.ratings.find((r) => r.reviewerId === session.user.id);

  const [existingReviews, existingDisagreement] = await Promise.all([
    myRating
      ? prisma.ratingReview.findMany({
          where: { ratingId: myRating.id },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    myRating
      ? prisma.ratingDisagreement.findFirst({ where: { ratingId: myRating.id } })
      : Promise.resolve(null),
  ]);

  const myCategoryScores = myRating
    ? CRITERIA_CATEGORIES.map((cat) => ({
        name: cat.name,
        score: (myRating.scores as Record<string, number>)[cat.name] ?? 0,
        maxPoints: cat.maxPoints,
      })).filter((c) => (myRating.scores as Record<string, number>)[c.name] !== -1)
    : [];

  const visibleAverage =
    assignment && session.user.role !== "ADMIN"
      ? getVisibleAverageForReviewer(cycle.ratings, session.user.id)
      : cycle.ratings.length > 0
      ? cycle.ratings.reduce((sum, r) => sum + r.averageScore, 0) / cycle.ratings.length
      : null;

  const canRate =
    assignment?.availability === "AVAILABLE" && ratingOpen && !myRating;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <FadeIn>
        <Link
          href="/reviewer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" /> Back to My Reviews
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {toTitleCase(cycle.user.name)}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {cycle.user.department && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="size-3" /> {cycle.user.department}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3" /> {cycle.type} Cycle
              </span>
              {assignment && (
                <span className="text-xs font-mono font-semibold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  Your role: {assignment.role}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1 font-medium border border-primary/20">
              {displayStatus.replace(/_/g, " ")}
            </span>
            {visibleAverage !== null && (
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full px-3 py-1 font-medium border border-green-200 dark:border-green-800">
                Avg: {visibleAverage.toFixed(2)}
              </span>
            )}
            {cycle.self && cycle.self.editCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <FileText className="size-3" />
                Self-assessment edited {cycle.self.editCount}×
              </span>
            )}
          </div>
        </div>
      </FadeIn>

      <div className={`grid gap-5 items-start ${myRating ? "xl:grid-cols-[1fr_420px]" : ""}`}>
        {/* Left: cycle progress + primary CTA */}
        <div className="space-y-4">
          <FadeIn delay={0.08}>
            <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Reviewer Progress
                </p>
              </div>
              <div className="divide-y divide-border">
                {cycle.assignments.map((a) => {
                  const rated = cycle.ratings.find((r) => r.role === a.role);
                  const isMe = assignment?.role === a.role;
                  const canSeeScores = !!myRating || session.user.role === "ADMIN";

                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isMe ? "bg-primary/5" : ""}`}
                    >
                      {rated ? (
                        <CheckCircle className="size-4 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="size-4 text-border shrink-0" />
                      )}
                      <span className="text-xs font-mono font-semibold text-muted-foreground w-16 shrink-0">
                        {a.role}
                      </span>
                      <span className="text-sm text-foreground flex-1 min-w-0">
                        {toTitleCase(a.reviewer.name)}
                        {isMe && (
                          <span className="ml-1.5 text-[10px] text-primary font-medium">(you)</span>
                        )}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {rated && canSeeScores && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-bold">
                            {rated.averageScore.toFixed(2)}
                          </span>
                        )}
                        {rated && !canSeeScores && (
                          <span className="text-[10px] text-muted-foreground italic">
                            Submit yours to see
                          </span>
                        )}
                        {isMe && assignment?.availability === "PENDING" && (
                          <Link
                            href={`/reviewer/${cycleId}/availability`}
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1 transition-colors"
                          >
                            Set Availability <ChevronRight className="size-3" />
                          </Link>
                        )}
                        {isMe && canRate && (
                          <Link
                            href={`/reviewer/${cycleId}/rate`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#0e8a95] hover:bg-[#0ea5b0] rounded-lg px-2.5 py-1 transition-colors"
                          >
                            <Star className="size-3" /> Rate Now <ChevronRight className="size-3" />
                          </Link>
                        )}
                        {isMe && myRating && (
                          <Link
                            href={`/reviewer/${cycleId}/rate`}
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1 transition-colors"
                          >
                            View Form <ChevronRight className="size-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!reviewOpen && (
                <div className="px-5 py-3 bg-muted/40 border-t border-border text-xs text-muted-foreground">
                  Rating unlocks after the self-assessment period is completed.
                </div>
              )}
              {reviewOpen && !ratingOpen && (
                <div className="px-5 py-3 bg-muted/40 border-t border-border text-xs text-muted-foreground">
                  Waiting for all assigned reviewers to confirm availability.
                </div>
              )}
            </div>
          </FadeIn>

          {cycle.self && (
            <FadeIn delay={0.1}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-xl px-4 py-3">
                <CalendarDays className="size-3.5 shrink-0" />
                Self-assessment deadline:{" "}
                <span className="text-foreground font-medium">
                  {cycle.self.editableUntil.toLocaleString("en-IN")}
                </span>
              </div>
            </FadeIn>
          )}

          {assignment && !myRating && ratingOpen && !existingExtension && (
            <FadeIn delay={0.15}>
              <ExtensionRequestForm cycleId={cycleId} />
            </FadeIn>
          )}
          {existingExtension && (
            <FadeIn delay={0.15}>
              <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                Extension request pending admin approval.
              </div>
            </FadeIn>
          )}
        </div>

        {/* Right: post-submission inline actions */}
        {myRating && (
          <div className="space-y-4">
            <FadeIn delay={0.12}>
              <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Post-Submission Actions
                  </p>
                  <span className="text-[10px] text-muted-foreground italic">
                    Rating locked · these don&apos;t change the score
                  </span>
                </div>
                <div className="p-4">
                  <PostCommentForm
                    ratingId={myRating.id}
                    existingComment={myRating.postComment ?? null}
                  />
                </div>
              </div>
            </FadeIn>

            {myCategoryScores.length > 0 && (
              <FadeIn delay={0.18}>
                <RatingReviewForm
                  ratingId={myRating.id}
                  cycleId={cycleId}
                  categoryScores={myCategoryScores}
                  existingReviews={existingReviews.map((r) => ({
                    criteriaName: r.criteriaName,
                    revisedScore: r.revisedScore,
                    justification: r.justification,
                    updatedAt: r.updatedAt.toISOString(),
                  }))}
                />
              </FadeIn>
            )}

            {myCategoryScores.length > 0 && (
              <FadeIn delay={0.22}>
                <RatingDisagreementForm
                  ratingId={myRating.id}
                  cycleId={cycleId}
                  categoryScores={myCategoryScores}
                  existing={
                    existingDisagreement
                      ? {
                          evaluation: existingDisagreement.evaluation as "ACCURATE" | "OVERRATED" | "UNDERRATED",
                          comment: existingDisagreement.comment,
                          revisedScores: existingDisagreement.revisedScores as Record<string, number> | null,
                          ceilingMin: existingDisagreement.ceilingMin ? Number(existingDisagreement.ceilingMin) : null,
                          ceilingMax: existingDisagreement.ceilingMax ? Number(existingDisagreement.ceilingMax) : null,
                        }
                      : null
                  }
                />
              </FadeIn>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
