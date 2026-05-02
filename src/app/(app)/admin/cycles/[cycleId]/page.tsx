import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import Link from "next/link";
import { CRITERIA_CATEGORIES } from "@/lib/criteria";
import { ArrowLeft, Star, ClipboardEdit, Clock, User } from "lucide-react";

export default async function CycleRatingsPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const session = await auth();
  const role = session?.user?.role;
  const secondaryRole = session?.user?.secondaryRole;
  const allowed = role === "ADMIN" || secondaryRole === "ADMIN" || role === "MANAGEMENT" || role === "PARTNER";
  if (!session?.user || !allowed) {
    return null;
  }

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      user: true,
      ratings: {
        include: {
          reviewer: { select: { id: true, name: true, role: true } },
          ratingReviews: {
            orderBy: { updatedAt: "desc" },
          },
        },
      },
      decision: { include: { slab: true } },
    },
  });
  if (!cycle) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { cycleId, action: "RATING_REVIEW_SUBMITTED" },
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });

  const fmt = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeIn>
        <Link
          href={role === "ADMIN" || secondaryRole === "ADMIN" ? "/admin/cycles" : "/history"}
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5"
        >
          <ArrowLeft className="size-3.5" /> {role === "ADMIN" || secondaryRole === "ADMIN" ? "Back to Cycles" : "Back to History"}
        </Link>
        <div className="mt-2">
          <h1 className="ds-h1">
            {toTitleCase(cycle.user.name)} — Ratings Detail
          </h1>
          <p className="ds-body mt-1">
            {cycle.type} cycle · {cycle.status.replace(/_/g, " ")}
          </p>
        </div>
      </FadeIn>

      {/* Final decision summary */}
      {cycle.decision && (
        <FadeIn delay={0.05}>
          <Card className="border-0 shadow-sm bg-green-50/50 dark:bg-green-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-700 dark:text-green-400">Final Decision</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Final Rating</div>
                <div className="font-bold text-slate-900 dark:text-white">{cycle.decision.finalRating.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Slab</div>
                <div className="font-bold text-slate-900 dark:text-white">{cycle.decision.slab?.label ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Increment</div>
                <div className="font-bold text-green-600">+₹{Number(cycle.decision.finalAmount).toLocaleString()}/yr</div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Per-reviewer ratings with review layer */}
      {cycle.ratings.map((rating, idx) => {
        const scores = rating.scores as Record<string, number>;
        const reviews = rating.ratingReviews;

        return (
          <FadeIn key={rating.id} delay={0.08 + idx * 0.05}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="size-4 text-[#008993]" />
                    {toTitleCase(rating.reviewer.name)}
                    <span className="text-xs font-normal text-slate-500">({rating.role})</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-[#008993]/10 text-[#008993] rounded-full font-bold">
                      Avg: {rating.averageScore.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {fmt(rating.submittedAt)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Original scores table */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                    <Star className="size-3" /> Original Submission
                  </p>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                          <th className="py-1.5 pr-4 font-medium">Criteria</th>
                          <th className="py-1.5 pr-4 font-medium text-right">Score</th>
                          <th className="py-1.5 font-medium text-right">Max</th>
                          {reviews.length > 0 && <th className="py-1.5 pl-4 font-medium text-right text-purple-600">Revised</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {CRITERIA_CATEGORIES.map((cat) => {
                          const score = scores[cat.name];
                          const isAO = score === -1;
                          const review = reviews.find((r) => r.criteriaName === cat.name);
                          return (
                            <tr key={cat.name} className={review ? "bg-purple-50/50 dark:bg-purple-950/10" : ""}>
                              <td className="py-1.5 pr-4 text-slate-700 dark:text-slate-300">{cat.name}</td>
                              <td className="py-1.5 pr-4 text-right font-medium text-slate-900 dark:text-white">
                                {isAO ? <span className="text-amber-500 text-[10px]">Avg Out</span> : score}
                              </td>
                              <td className="py-1.5 text-right text-slate-400">{cat.maxPoints}</td>
                              {reviews.length > 0 && (
                                <td className="py-1.5 pl-4 text-right">
                                  {review ? (
                                    <span className="font-bold text-purple-600">{review.revisedScore}</span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Review layer details */}
                {reviews.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-500 mb-2 flex items-center gap-1">
                      <ClipboardEdit className="size-3" /> Edited / Review Ratings
                    </p>
                    <div className="space-y-2">
                      {reviews.map((rv) => (
                        <div key={rv.id} className="rounded-lg border border-purple-100 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/10 p-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{rv.criteriaName}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                                Original: {rv.originalScore}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-700 font-bold">
                                Revised: {rv.revisedScore}
                              </span>
                              <span className={`text-[10px] font-medium ${rv.revisedScore > rv.originalScore ? "text-green-600" : rv.revisedScore < rv.originalScore ? "text-red-500" : "text-slate-400"}`}>
                                {rv.revisedScore > rv.originalScore ? `+${(rv.revisedScore - rv.originalScore).toFixed(1)}` : rv.revisedScore < rv.originalScore ? `${(rv.revisedScore - rv.originalScore).toFixed(1)}` : "±0"}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 italic">{rv.justification}</p>
                          <div className="flex items-center gap-1 text-[9px] text-slate-400">
                            <Clock className="size-2.5" /> {fmt(rv.updatedAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {rating.comments && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Comments</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{rating.comments}</p>
                  </div>
                )}
                {rating.postComment && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-lg p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Post-submission note</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{rating.postComment}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        );
      })}

      {/* Audit log */}
      {auditLogs.length > 0 && (
        <FadeIn delay={0.3}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Audit Log — Rating Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.map((log) => {
                  const before = log.before as Record<string, unknown> | null;
                  const after = log.after as Record<string, unknown> | null;
                  return (
                    <div key={log.id} className="flex gap-3 text-xs">
                      <div className="shrink-0 text-slate-400 whitespace-nowrap">{fmt(log.createdAt)}</div>
                      <div className="flex-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {toTitleCase(log.actor.name)}
                        </span>
                        <span className="text-slate-500"> revised </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {String(before?.criteriaName ?? "")}
                        </span>
                        <span className="text-slate-500">: </span>
                        <span className="line-through text-slate-400">{String(before?.score ?? "")}</span>
                        <span className="text-slate-400"> → </span>
                        <span className="text-purple-600 font-bold">{String(after?.score ?? "")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
