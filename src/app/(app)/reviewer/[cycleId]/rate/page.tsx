import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isRatingOpen } from "@/lib/workflow";
import { getSystemDate } from "@/lib/system-date";
import { RateForm } from "./rate-form";
import { PostCommentForm } from "../post-comment-form";
import { RatingReviewForm } from "../rating-review-form";
import { RatingDisagreementForm } from "../rating-disagreement-form";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import {
  SUPPLEMENTARY_SECTIONS,
  getCriteriaForRole,
  GRADE_BANDS,
  type CriteriaCategory,
} from "@/lib/criteria";
import { getMergedCriteria } from "@/lib/criteria-overrides";
import { isManagement, isAdmin } from "@/lib/rbac";
import {
  TrendingUp,
  User,
  IndianRupee,
  FileText,
  EyeOff,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

type SelfAnswers = Record<
  string,
  { score: number; comment: string; questionAnswers?: Record<string, string> }
> & { __supplementary?: Record<string, string> };

function parseRatingComments(comments: string | null, categories: CriteriaCategory[]) {
  const byCategory: Record<string, string> = {};
  const overall: string[] = [];

  for (const block of (comments ?? "").split(/\n{2,}/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^\[(.+?)\]:\s*([\s\S]*)$/);
    if (match && categories.some((cat) => cat.name === match[1])) {
      byCategory[match[1]] = match[2].trim();
    } else {
      overall.push(trimmed);
    }
  }

  return { overall: overall.join("\n\n"), byCategory };
}

/** Roles whose salary is confidential from reviewers */
const SALARY_CONFIDENTIAL_ROLES = ["HR", "MANAGER"] as const;

export default async function RatePage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const assignment = await prisma.cycleAssignment.findFirst({
    where: { cycleId, reviewerId: session.user.id },
    include: {
      cycle: {
        include: {
          user: { include: { salary: true } },
          self: true,
          assignments: { select: { availability: true } },
        },
      },
    },
  });
  if (!assignment) notFound();
  if (assignment.availability !== "AVAILABLE") redirect(`/reviewer/${cycleId}`);
  const now = await getSystemDate();
  if (!isRatingOpen(assignment.cycle, now)) redirect(`/reviewer/${cycleId}`);

  const existing = await prisma.rating.findFirst({
    where: { cycleId, reviewerId: session.user.id },
  });

  const [peerRatingExistsCount, allMergedCategories] = await Promise.all([
    prisma.rating.count({ where: { cycleId } }),
    getMergedCriteria(),
  ]);
  const peerRatingExists = peerRatingExistsCount > 0;
  const mergedCategories = getCriteriaForRole(allMergedCategories, assignment.role);
  const roleMaxPoints = mergedCategories.reduce((s, c) => s + c.maxPoints, 0);

  const emp = assignment.cycle.user;
  const reviewerRole = session.user.role;
  const reviewerSecondaryRole = session.user.secondaryRole ?? null;

  // Salary confidentiality: hidden from reviewers when appraisee is HR or MANAGER.
  // Management and Admin always see salary.
  const appraiseeRoleIsConfidential = (SALARY_CONFIDENTIAL_ROLES as readonly string[]).includes(emp.role);
  const viewerCanSeeSalary =
    isManagement(reviewerRole, reviewerSecondaryRole) ||
    isAdmin(reviewerRole, reviewerSecondaryRole);
  const salaryHidden = appraiseeRoleIsConfidential && !viewerCanSeeSalary;

  // Salary revisions (last 5) — only fetch if allowed
  const revisions = salaryHidden
    ? []
    : await prisma.salaryRevision.findMany({
        where: { userId: assignment.cycle.userId },
        orderBy: { effectiveFrom: "desc" },
        take: 5,
      });

  const selfAnswers = assignment.cycle.self?.answers as SelfAnswers | null;
  const suppAnswers = selfAnswers?.__supplementary ?? {};

  const sal = salaryHidden ? null : emp.salary;

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtMonth = (d: Date) =>
    d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  const submittedScores = existing
    ? (existing.scores as Record<string, number>)
    : null;
  const submittedAvg = existing ? existing.averageScore : null;
  const currentGrade = submittedAvg !== null
    ? GRADE_BANDS.find((b) => submittedAvg >= b.minNormalized && submittedAvg <= b.maxNormalized) ?? null
    : null;
  const parsedComments = parseRatingComments(existing?.comments ?? null, mergedCategories);
  const submittedCategoryScores = existing && submittedScores
    ? mergedCategories
        .map((cat) => ({
          name: cat.name,
          score: submittedScores[cat.name] ?? 0,
          maxPoints: cat.maxPoints,
        }))
        .filter((cat) => submittedScores[cat.name] !== -1)
    : [];

  const existingReviews = existing
    ? await prisma.ratingReview.findMany({
        where: { ratingId: existing.id },
        orderBy: { updatedAt: "desc" },
      })
    : [];
  const existingDisagreement = existing
    ? await prisma.ratingDisagreement.findFirst({ where: { ratingId: existing.id } })
    : null;
  const peerRatings = existing
    ? await prisma.rating.findMany({
        where: { cycleId },
        include: { reviewer: { select: { id: true, name: true, role: true } } },
        orderBy: { submittedAt: "asc" },
      })
    : [];

  return (
    <div className="max-w-[1400px] ">
      <FadeIn>
        <div className="mb-5">
          <Link
            href={`/reviewer/${cycleId}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="size-3.5" /> Back
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="ds-h1">
                {existing ? "Submitted Rating — " : "Rate "}{toTitleCase(emp.name)}
              </h1>
              <p className="ds-body mt-1">
                {assignment.role} Reviewer · {assignment.cycle.type} cycle
              </p>
            </div>
            {existing && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-full px-3 py-1.5">
                  <CheckCircle className="size-3.5" /> Rating Submitted
                </span>
                {currentGrade && (
                  <span className="text-sm font-black px-3 py-1.5 rounded-full border bg-[#0e8a95]/10 text-[#0e8a95] border-[#0e8a95]/20">
                    {currentGrade.grade} · {submittedAvg?.toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_520px] gap-6 items-start">
        {/* ── LEFT: Reference panel ── */}
        <div className="space-y-5 min-w-0">

          {/* Employee profile + current salary */}
          <FadeIn delay={0.04}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="size-4 text-[#008993]" /> Employee Overview
                  {assignment.cycle.self && (
                    <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      <FileText className="size-3" />
                      Self-assessment edited {assignment.cycle.self.editCount} time{assignment.cycle.self.editCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Name", value: toTitleCase(emp.name) },
                    { label: "Department", value: emp.department ?? "—" },
                    { label: "Designation", value: emp.designation ?? "—" },
                    { label: "Joining Date", value: emp.joiningDate.toLocaleDateString("en-IN") },
                    { label: "Location", value: emp.location ?? "—" },
                    { label: "Employment Type", value: emp.employmentType ?? "—" },
                  ].map((f) => (
                    <div key={f.label} className="space-y-0.5">
                      <div className="text-[10px] font-medium text-slate-400">{f.label}</div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{f.value}</div>
                    </div>
                  ))}
                </div>

                {/* Salary structure */}
                {salaryHidden ? (
                  <>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                      <EyeOff className="size-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-500">Salary — Confidential</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Compensation details are not visible for {emp.role} appraisees.
                        </div>
                      </div>
                    </div>
                  </>
                ) : sal && (
                  <>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                        <IndianRupee className="size-3" /> Current Salary Structure
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {[
                          { label: "Gross / yr", value: fmt(Number(sal.grossAnnum)), highlight: true },
                          { label: "CTC / yr", value: fmt(Number(sal.ctcAnnum)) },
                          { label: "Basic / mo", value: fmt(Number(sal.basic)) },
                          { label: "HRA / mo", value: fmt(Number(sal.hra)) },
                          { label: "Conveyance", value: fmt(Number(sal.conveyance)) },
                          { label: "Transport", value: fmt(Number(sal.transport)) },
                          { label: "Travelling", value: fmt(Number(sal.travelling)) },
                          { label: "Fixed Allw.", value: fmt(Number(sal.fixedAllowance)) },
                          ...(Number(sal.stipend) > 0 ? [{ label: "Stipend", value: fmt(Number(sal.stipend)) }] : []),
                        ].map((f) => (
                          <div
                            key={f.label}
                            className={`rounded-lg px-2.5 py-2 ${
                              f.highlight
                                ? "bg-[#008993]/10 border border-[#008993]/20"
                                : "bg-slate-50 dark:bg-slate-800/50"
                            }`}
                          >
                            <div className="text-[9px] text-slate-400">{f.label}</div>
                            <div className={`text-xs font-semibold mt-0.5 ${f.highlight ? "text-[#008993]" : "text-slate-700 dark:text-slate-300"}`}>
                              {f.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {/* Salary revision history — hidden if salary confidential */}
          {!salaryHidden && revisions.length > 0 && (
            <FadeIn delay={0.07}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="size-4 text-[#ff8333]" /> Salary Revision History
                    <span className="ml-auto text-[10px] font-normal text-slate-400">
                      Last {revisions.length} revision{revisions.length !== 1 ? "s" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-2">
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="text-left border-b border-border bg-muted/40">
                          <th className="py-2.5 px-4 ds-label">Effective</th>
                          <th className="px-4 ds-label">Gross / yr</th>
                          <th className="px-4 ds-label">CTC / yr</th>
                          <th className="px-4 ds-label">Revised CTC</th>
                          <th className="px-4 ds-label">Rev %</th>
                          <th className="px-4 ds-label">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {revisions.map((r) => (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-4 text-slate-600 whitespace-nowrap">{fmtMonth(r.effectiveFrom)}</td>
                            <td className="px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">{fmt(Number(r.grossAnnum))}</td>
                            <td className="px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">{fmt(Number(r.ctcAnnum))}</td>
                            <td className="px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{fmt(Number(r.revisedCtc))}</td>
                            <td className="px-4">
                              {r.revisionPercentage ? (
                                <span className="text-green-600 font-semibold">
                                  +{Number(r.revisionPercentage)}%
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  r.status === "Approved"
                                    ? "bg-green-100 text-green-700"
                                    : r.status === "Pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* Confidential revision history notice */}
          {salaryHidden && (
            <FadeIn delay={0.07}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <EyeOff className="size-4 text-slate-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Salary Revision History — Confidential</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Revision history is not visible for {emp.role} appraisees.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* NOTE: Salary slabs/increments are hidden from reviewers by RBAC policy */}

          {/* Self-assessment answers */}
          {selfAnswers && (
            <FadeIn delay={0.13}>
              <Card className="border-0 shadow-sm border-l-4 border-l-[#00cec4]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#008993]">
                    <FileText className="size-4" /> Employee Self-Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5 text-xs text-slate-600 dark:text-slate-400">

                    {/* Part A */}
                    <div className="space-y-4">
                      <div className="text-[10px] font-semibold text-slate-400">
                        Part A — Performance
                      </div>
                      {mergedCategories.filter((c) => !c.reviewerOnly).map((cat) => {
                        const ans = selfAnswers[cat.name];
                        if (!ans) return null;
                        return (
                          <div
                            key={cat.name}
                            className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {cat.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-[#008993]/10 text-[#008993] font-bold text-[10px]">
                                Self: {ans.score} / {cat.maxPoints} pts
                              </span>
                            </div>
                            {ans.questionAnswers &&
                              Object.entries(ans.questionAnswers).map(([q, a]) => (
                                <div
                                  key={q}
                                  className="pl-3 border-l-2 border-slate-100 dark:border-slate-700 space-y-0.5"
                                >
                                  <div className="text-[10px] text-slate-400 italic">{q}</div>
                                  <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {a}
                                  </div>
                                </div>
                              ))}
                            {ans.comment && (
                              <div className="pl-3 border-l-2 border-[#008993]/30 text-slate-500">
                                <span className="font-medium text-slate-400 text-[10px]">
                                  Summary:{" "}
                                </span>
                                {ans.comment}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Parts B / C / D */}
                    {Object.keys(suppAnswers).length > 0 && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="text-[10px] font-semibold text-slate-400">
                          Parts B / C / D
                        </div>
                        {SUPPLEMENTARY_SECTIONS.map((sec) => (
                          <div key={sec.title} className="space-y-2">
                            <div className="text-[10px] font-medium text-slate-500">
                              Part {sec.part} — {sec.title}
                            </div>
                            {sec.questions.map((q) =>
                              suppAnswers[q.id] ? (
                                <div
                                  key={q.id}
                                  className="pl-3 border-l-2 border-slate-100 dark:border-slate-700 space-y-0.5"
                                >
                                  <div className="text-[10px] text-slate-400 italic whitespace-pre-line">
                                    {q.text.split("\n")[0]}
                                  </div>
                                  <div className="text-slate-600 dark:text-slate-300">
                                    {suppAnswers[q.id]}
                                  </div>
                                </div>
                              ) : null
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </div>

        {/* ── RIGHT: Rating form or submitted read-only view ── */}
        <div>
          <FadeIn delay={0.06}>
            {existing && submittedScores ? (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Your Submitted Scores</span>
                    {currentGrade && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-[#0e8a95]/10 text-[#0e8a95] border-[#0e8a95]/20">
                        {currentGrade.grade} — {submittedAvg?.toFixed(2)} / 100
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {mergedCategories.map((cat) => {
                      const raw = submittedScores[cat.name];
                      if (raw === undefined) return null;
                      const isAO = raw === -1;
                      const pct = isAO ? null : Math.round((raw / cat.maxPoints) * 100);
                      return (
                        <div key={cat.name} className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{cat.name}</span>
                            {isAO ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Averaged Out</span>
                            ) : (
                              <span className="text-xs font-bold text-[#0e8a95]">{raw} / {cat.maxPoints}</span>
                            )}
                          </div>
                          {!isAO && pct !== null && (
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#0e8a95]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                          {parsedComments.byCategory[cat.name] && (
                            <div className="mt-2 rounded-md bg-slate-50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                              <span className="block text-[9px] font-semibold text-slate-400">
                                Criterion comment
                              </span>
                              {parsedComments.byCategory[cat.name]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {parsedComments.overall && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">Overall Comment</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                        {parsedComments.overall}
                      </p>
                    </div>
                  )}
                </div>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Peer Ratings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {peerRatings.length === 0 ? (
                      <p className="text-xs text-slate-400">No peer ratings submitted yet.</p>
                    ) : (
                      peerRatings.map((rating) => {
                        const ratingScores = rating.scores as Record<string, number>;
                        return (
                          <div key={rating.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {toTitleCase(rating.reviewer.name)}
                                  {rating.reviewerId === session.user.id ? " (you)" : ""}
                                </p>
                                <p className="text-[10px] text-slate-400">{rating.role}</p>
                              </div>
                              <span className="rounded-full bg-[#0e8a95]/10 px-2 py-0.5 text-xs font-bold text-[#0e8a95]">
                                {rating.averageScore.toFixed(2)}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-1.5">
                              {mergedCategories.map((cat) => {
                                const value = ratingScores[cat.name];
                                if (value === undefined) return null;
                                return (
                                  <div key={cat.name} className="rounded bg-slate-50 px-2 py-1 text-[10px] dark:bg-slate-800/60">
                                    <span className="block truncate text-slate-400">{cat.name}</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      {value === -1 ? "Avg out" : `${value}/${cat.maxPoints}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {submittedCategoryScores.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Post-Submission Actions</CardTitle>
                      <p className="text-xs text-slate-500">
                        These notes stay attached to this submitted rating. Your original score remains unchanged.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <PostCommentForm
                        ratingId={existing.id}
                        existingComment={existing.postComment ?? null}
                      />
                      <RatingReviewForm
                        ratingId={existing.id}
                        cycleId={cycleId}
                        categoryScores={submittedCategoryScores}
                        existingReviews={existingReviews.map((review) => ({
                          criteriaName: review.criteriaName,
                          revisedScore: review.revisedScore,
                          justification: review.justification,
                          updatedAt: review.updatedAt.toISOString(),
                        }))}
                      />
                      <RatingDisagreementForm
                        ratingId={existing.id}
                        cycleId={cycleId}
                        categoryScores={submittedCategoryScores}
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
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <RateForm
                cycleId={cycleId}
                role={assignment.role}
                categories={mergedCategories}
                totalMaxPoints={roleMaxPoints}
                peerRatingExists={peerRatingExists}
                isAdmin={true}
              />
            )}
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
