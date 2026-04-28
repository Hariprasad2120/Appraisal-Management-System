import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isRatingOpen } from "@/lib/workflow";
import { RateForm } from "./rate-form";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import {
  SUPPLEMENTARY_SECTIONS,
  getCriteriaForRole,
} from "@/lib/criteria";
import { getMergedCriteria } from "@/lib/criteria-overrides";
import {
  TrendingUp,
  User,
  IndianRupee,
  FileText,
} from "lucide-react";

type SelfAnswers = Record<
  string,
  { score: number; comment: string; questionAnswers?: Record<string, string> }
> & { __supplementary?: Record<string, string> };

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
  if (!isRatingOpen(assignment.cycle)) redirect(`/reviewer/${cycleId}`);

  const existing = await prisma.rating.findFirst({
    where: { cycleId, reviewerId: session.user.id },
  });
  if (existing) redirect(`/reviewer/${cycleId}`);

  const [peerRatingExistsCount, allMergedCategories] = await Promise.all([
    prisma.rating.count({ where: { cycleId } }),
    getMergedCriteria(),
  ]);
  const peerRatingExists = peerRatingExistsCount > 0;
  const mergedCategories = getCriteriaForRole(allMergedCategories, assignment.role);
  const roleMaxPoints = mergedCategories.reduce((s, c) => s + c.maxPoints, 0);

  // Salary revisions (last 5)
  const revisions = await prisma.salaryRevision.findMany({
    where: { userId: assignment.cycle.userId },
    orderBy: { effectiveFrom: "desc" },
    take: 5,
  });

  const selfAnswers = assignment.cycle.self?.answers as SelfAnswers | null;
  const suppAnswers = selfAnswers?.__supplementary ?? {};

  const emp = assignment.cycle.user;
  const sal = emp.salary;
  const grossAnnum = sal ? Number(sal.grossAnnum) : null;

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtMonth = (d: Date) =>
    d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  return (
    // Wide layout: side-by-side panels
    <div className="max-w-[1400px] mx-auto">
      <FadeIn>
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Rate {toTitleCase(emp.name)}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {assignment.role} Reviewer · {assignment.cycle.type} cycle
          </p>
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
                      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{f.label}</div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{f.value}</div>
                    </div>
                  ))}
                </div>

                {sal && (
                  <>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
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
                            <div className="text-[9px] uppercase tracking-wider text-slate-400">{f.label}</div>
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

          {/* Salary revision history */}
          {revisions.length > 0 && (
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
                        <tr className="text-left text-slate-400 border-b bg-slate-50 dark:bg-slate-800/50">
                          <th className="py-2 px-4 font-medium">Effective</th>
                          <th className="px-4 font-medium">Gross / yr</th>
                          <th className="px-4 font-medium">CTC / yr</th>
                          <th className="px-4 font-medium">Revised CTC</th>
                          <th className="px-4 font-medium">Rev %</th>
                          <th className="px-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {revisions.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
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
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
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
                                <span className="font-medium text-slate-400 text-[10px] uppercase tracking-wide">
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
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                          Parts B / C / D
                        </div>
                        {SUPPLEMENTARY_SECTIONS.map((sec) => (
                          <div key={sec.title} className="space-y-2">
                            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
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

        {/* ── RIGHT: Rating form ── */}
        <div className="xl:sticky xl:top-6">
          <FadeIn delay={0.06}>
            <RateForm
              cycleId={cycleId}
              role={assignment.role}
              categories={mergedCategories}
              totalMaxPoints={roleMaxPoints}
              peerRatingExists={peerRatingExists}
              isAdmin={true}
            />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
