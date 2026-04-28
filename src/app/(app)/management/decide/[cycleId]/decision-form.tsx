"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "motion/react";
import { finalizeDecisionAction } from "./actions";
import {
  TrendingUp,
  IndianRupee,
  GitCompare,
  Star,
  ClipboardList,
  Users,
  Wand2,
} from "lucide-react";

type PerformerPreset = "high" | "average" | "low";

type CriteriaItem = {
  name: string;
  maxPoints: number;
  score: number;
  revisedScore: number | null;
  justification: string | null;
};

type Disagreement = {
  evaluation: string;
  comment: string | null;
  ceilingMin: number | null;
  ceilingMax: number | null;
  revisedScores: Record<string, number> | null;
};

type ReviewerRating = {
  id: string;
  role: string;
  reviewerName: string;
  averageScore: number;
  comments: string;
  postComment: string | null;
  criteriaBreakdown: CriteriaItem[];
  hasRevisions: boolean;
  disagreement: Disagreement | null;
};

type MgmtCriterion = {
  name: string;
  maxPoints: number;
  items: string[];
};

type SlabInfo = {
  id: string;
  label: string;
  minRating: number;
  maxRating: number;
  hikePercent: number;
  salaryTier: string;
};

export function DecisionForm({
  cycleId,
  reviewerAvgRating,
  selfNormalizedScore,
  suggestedHikePercent,
  grossAnnum,
  reviewerRatings,
  selfAnswers,
  mgmtCriteria,
  slabs,
  isAdmin = false,
}: {
  cycleId: string;
  reviewerAvgRating: number;
  selfNormalizedScore: number;
  suggestedHikePercent: number;
  grossAnnum: number;
  reviewerRatings: ReviewerRating[];
  selfAnswers: Record<string, { score: number; comment: string }> | null;
  mgmtCriteria: MgmtCriterion[];
  slabs: SlabInfo[];
  isAdmin?: boolean;
}) {
  const [comments, setComments] = useState("");
  const [managementComment, setManagementComment] = useState("");
  const [mgmtScores, setMgmtScores] = useState<Record<string, Record<string, number>>>({});
  const [performerPreset, setPerformerPreset] = useState<PerformerPreset>("high");
  const [tentDate1, setTentDate1] = useState("");
  const [tentDate2, setTentDate2] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function demoFill() {
    const DEMO_COMMENTS_MAP: Record<PerformerPreset, string> = {
      high: "Exceptional performance across all metrics. Recommending maximum increment as per slab.",
      average: "Solid contributor meeting all core expectations. Increment aligned with standard band.",
      low: "Performance below target in several areas. Marginal increment with clear improvement goals set.",
    };
    const DEMO_MGMT: Record<PerformerPreset, number> = { high: 5, average: 3, low: 2 };
    const baseScore = DEMO_MGMT[performerPreset];
    const newMgmtScores: Record<string, Record<string, number>> = {};
    mgmtCriteria.forEach((crit, ci) => {
      newMgmtScores[crit.name] = {};
      crit.items.forEach((item, ii) => {
        const jitter = ((ci + ii) % 2 === 0) ? 0 : (performerPreset === "high" ? -1 : 1);
        newMgmtScores[crit.name][item] = Math.min(5, Math.max(1, baseScore + jitter));
      });
    });
    setMgmtScores(newMgmtScores);
    setComments(DEMO_COMMENTS_MAP[performerPreset]);
    setManagementComment(`Management assessment complete. Performance level: ${performerPreset}.`);
    toast.success("Demo data filled — review before finalizing");
  }

  function setItemScore(criteriaName: string, item: string, score: number) {
    setMgmtScores((prev) => ({
      ...prev,
      [criteriaName]: { ...(prev[criteriaName] ?? {}), [item]: score },
    }));
  }

  // Flatten mgmt scores to { "CriteriaName.Item": score }
  function flattenMgmtScores(): Record<string, number> {
    const flat: Record<string, number> = {};
    for (const [crit, items] of Object.entries(mgmtScores)) {
      for (const [item, score] of Object.entries(items)) {
        flat[`${crit}.${item}`] = score;
      }
    }
    return flat;
  }

  function mgmtCriteriaScore(crit: MgmtCriterion): number {
    const itemScores = mgmtScores[crit.name];
    if (!itemScores) return 0;
    const vals = crit.items.map((i) => itemScores[i] ?? 0);
    const avg = vals.reduce((a, b) => a + b, 0) / crit.items.length;
    return (avg / 5) * crit.maxPoints;
  }

  function mgmtTotalScore(): number {
    return mgmtCriteria.reduce((s, c) => s + mgmtCriteriaScore(c), 0);
  }

  function mgmtTotalMax(): number {
    return mgmtCriteria.reduce((s, c) => s + c.maxPoints, 0);
  }

  // Normalize management score to 0-100
  const mgmtMax = mgmtTotalMax();
  const mgmtRaw = mgmtTotalScore();
  const mgmtNormalized = mgmtMax > 0 ? (mgmtRaw / mgmtMax) * 100 : 0;

  // Weighted composite: 10% self + 70% reviewer + 20% mgmt
  const allMgmtFilled = mgmtCriteria.length > 0 && mgmtCriteria.every((c) =>
    c.items.every((item) => (mgmtScores[c.name]?.[item] ?? 0) > 0)
  );
  const compositeScore = allMgmtFilled
    ? 0.1 * selfNormalizedScore + 0.7 * reviewerAvgRating + 0.2 * mgmtNormalized
    : 0.1 * selfNormalizedScore + 0.7 * reviewerAvgRating; // partial until mgmt scored

  // Determine salary tier from monthly gross
  const monthlyGross = grossAnnum / 12;
  const salaryTierKey =
    monthlyGross <= 15000 ? "UPTO_15K" : monthlyGross <= 30000 ? "BTW_15K_30K" : "ABOVE_30K";

  // Find slab matching composite score AND salary tier (tier-specific first, then ALL fallback)
  const matchedSlab =
    slabs.find(
      (s) =>
        compositeScore >= s.minRating &&
        compositeScore <= s.maxRating &&
        s.salaryTier === salaryTierKey,
    ) ??
    slabs.find(
      (s) =>
        compositeScore >= s.minRating &&
        compositeScore <= s.maxRating &&
        s.salaryTier === "ALL",
    ) ??
    null;
  const slabHikePercent = matchedSlab?.hikePercent ?? suggestedHikePercent;
  const increment = Math.round(grossAnnum * slabHikePercent / 100);
  const newGross = grossAnnum + increment;

  function submit() {
    if (!allMgmtFilled) {
      toast.error("Rate all management criteria before finalizing");
      return;
    }
    if (!tentDate1 || !tentDate2) {
      toast.error("Propose both tentative meeting dates before finalizing");
      return;
    }
    if (tentDate1 === tentDate2) {
      toast.error("Tentative dates must be different");
      return;
    }
    startTransition(async () => {
      const res = await finalizeDecisionAction({
        cycleId,
        finalRating: compositeScore,
        hikePercent: slabHikePercent,
        slabId: matchedSlab?.id,
        comments: comments || undefined,
        managementScores: flattenMgmtScores(),
        managementComment: managementComment || undefined,
        tentativeDate1: new Date(tentDate1).toISOString(),
        tentativeDate2: new Date(tentDate2).toISOString(),
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Decision recorded — HR notified to confirm meeting date");
      router.push("/management");
      router.refresh();
    });
  }

  const roleColors: Record<string, string> = {
    HR: "border-l-cyan-400",
    TL: "border-l-amber-400",
    MANAGER: "border-l-teal-400",
  };

  const roleBadge: Record<string, string> = {
    HR: "border-cyan-300 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
    TL: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    MANAGER: "border-teal-300 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400",
  };

  return (
    <div className="space-y-6">

      {/* ── Reviewer score summary pills ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {reviewerRatings.map((r) => (
          <div key={r.id} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleBadge[r.role] ?? ""}`}>
            {r.role}: {r.averageScore.toFixed(1)}
          </div>
        ))}
        <div className="text-xs font-bold text-blue-600 px-2.5 py-1 rounded-full border border-blue-300 bg-blue-50 dark:bg-blue-950/30">
          Reviewer Avg: {reviewerAvgRating.toFixed(2)}
        </div>
      </div>

      {/* ── Reviewer cards — fully expanded ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Reviewer Ratings</h2>
        {reviewerRatings.map((r) => (
          <Card key={r.id} className={`border-0 shadow-sm border-l-4 ${roleColors[r.role] ?? ""}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${roleBadge[r.role] ?? ""}`}>{r.role}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.reviewerName}</span>
                  {r.hasRevisions && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">✎ revised</span>
                  )}
                  {r.disagreement && r.disagreement.evaluation !== "ACCURATE" && (
                    <span className={`text-[10px] font-bold ${r.disagreement.evaluation === "OVERRATED" ? "text-red-500" : "text-blue-500"}`}>
                      ⚑ {r.disagreement.evaluation}
                    </span>
                  )}
                </div>
                <span className="text-xl font-bold text-slate-800 dark:text-white">{r.averageScore.toFixed(2)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* All criteria — fully visible */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Criteria Scores</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {r.criteriaBreakdown.map((c) => (
                    <div key={c.name} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 flex-1">{c.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{c.score}/{c.maxPoints}</span>
                        {c.revisedScore !== null && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">→ {c.revisedScore}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revised criteria detail */}
              {r.criteriaBreakdown.some((c) => c.revisedScore !== null) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-500 mb-1">Revisions</p>
                  <div className="space-y-1.5">
                    {r.criteriaBreakdown.filter((c) => c.revisedScore !== null).map((c) => (
                      <div key={c.name} className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                          <span className="text-slate-400 line-through">{c.score}</span>
                          <span className="text-purple-600 font-bold">→ {c.revisedScore}</span>
                        </div>
                        {c.justification && <p className="text-[10px] text-slate-500 italic mt-1">{c.justification}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Comments</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 whitespace-pre-line">{r.comments}</p>
              </div>

              {r.postComment && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-1">Post Note</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">{r.postComment}</p>
                </div>
              )}

              {r.disagreement && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-500 mb-1">Rating Evaluation</p>
                  <div className={`rounded-lg border p-2.5 text-xs space-y-1 ${
                    r.disagreement.evaluation === "ACCURATE"
                      ? "border-green-300 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                      : r.disagreement.evaluation === "OVERRATED"
                      ? "border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                      : "border-blue-300 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
                  }`}>
                    <div className="font-bold">{r.disagreement.evaluation}</div>
                    {r.disagreement.comment && <p className="italic opacity-80">{r.disagreement.comment}</p>}
                    {r.disagreement.ceilingMin !== null && r.disagreement.ceilingMax !== null && (
                      <p className="font-medium">Negotiation range: ₹{r.disagreement.ceilingMin.toLocaleString("en-IN")} – ₹{r.disagreement.ceilingMax.toLocaleString("en-IN")}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Self-Assessment ── */}
      {selfAnswers && Object.keys(selfAnswers).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <ClipboardList className="size-4" /> Self-Assessment
          </h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 space-y-3">
              {Object.entries(selfAnswers).map(([key, val]) => (
                <div key={key} className="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{key}</p>
                  {typeof val === "object" && val !== null && "score" in val ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Self score:</span>
                        <span className="text-sm font-bold text-[#008993]">{(val as { score: number }).score}</span>
                      </div>
                      {(val as { comment?: string }).comment && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic">{(val as { comment: string }).comment}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">{String(val)}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Two-column: Management Rating + Decision ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left: Management Rating */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Users className="size-4" /> Management Rating
          </h2>
          <Card className="border-0 shadow-sm border-l-4 border-l-[#008993]">
            <CardContent className="pt-4 space-y-5">
              {mgmtCriteria.map((crit) => {
                const critTotal = mgmtCriteriaScore(crit);
                return (
                  <div key={crit.name}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{crit.name}</p>
                      <span className="text-xs font-bold text-[#008993]">{critTotal.toFixed(1)}/{crit.maxPoints}</span>
                    </div>
                    <div className="space-y-2">
                      {crit.items.map((item) => {
                        const val = mgmtScores[crit.name]?.[item] ?? 0;
                        return (
                          <div key={item} className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500 w-36 shrink-0">{item}</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setItemScore(crit.name, item, n)}
                                  className={`w-7 h-7 rounded text-xs font-semibold transition-all border ${
                                    val === n
                                      ? "bg-[#008993] text-white border-[#008993]"
                                      : val >= n
                                      ? "bg-[#008993]/20 text-[#008993] border-[#008993]/30"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#008993]/50"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                            <span className="text-[11px] text-slate-400 w-4">{val > 0 ? val : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Management total */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Management Total</span>
                <span className="text-base font-bold text-[#008993]">{mgmtTotalScore().toFixed(1)} / {mgmtTotalMax()}</span>
              </div>

              <div>
                <Label className="text-xs">Management Comment (optional)</Label>
                <Textarea
                  value={managementComment}
                  onChange={(e) => setManagementComment(e.target.value)}
                  rows={2}
                  className="mt-1 text-xs"
                  placeholder="Overall management remarks..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Decision form + Comparison */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Star className="size-4" /> Decision
          </h2>

          {/* Composite score + slab + hike */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 space-y-4">
              {/* Weighted score breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Score Composition</p>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Self Assessment (10%)</span>
                    <span className="font-semibold">{selfNormalizedScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reviewer Average (70%)</span>
                    <span className="font-semibold">{reviewerAvgRating.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Management Rating (20%)</span>
                    <span className={`font-semibold ${allMgmtFilled ? "text-[#008993]" : "text-amber-500"}`}>
                      {allMgmtFilled ? mgmtNormalized.toFixed(1) : "— (fill above)"}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Composite Score</span>
                    <span className="font-black text-lg text-[#008993]">{compositeScore.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Matched slab */}
              {matchedSlab ? (
                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600">Increment Slab</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">{matchedSlab.label}</p>
                  <p className="text-xs text-green-600">Score {matchedSlab.minRating}–{matchedSlab.maxRating} · Tier: {matchedSlab.salaryTier.replace(/_/g, " ")} · Hike: <strong>{matchedSlab.hikePercent}%</strong></p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400">No slab matched for score {compositeScore.toFixed(2)}. Hike will use suggested value.</p>
                </div>
              )}

              {slabHikePercent > 0 && (
                <motion.div
                  key={increment}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-3"
                >
                  <TrendingUp className="size-4 text-green-600 shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-green-700 dark:text-green-400">{slabHikePercent}% hike</span>
                    <span className="text-green-600"> = </span>
                    <span className="font-bold text-green-700 dark:text-green-400">+₹{increment.toLocaleString("en-IN")}/yr</span>
                  </div>
                </motion.div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-400 mb-0.5">Composite Score</div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">{compositeScore.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">Current Gross</div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">₹{grossAnnum.toLocaleString("en-IN")}/yr</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">Increment</div>
                  <div className="font-semibold text-green-600">+₹{increment.toLocaleString("en-IN")}/yr</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">New Gross</div>
                  <div className="font-semibold text-blue-600">₹{newGross.toLocaleString("en-IN")}/yr</div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Decision Comments (optional)</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  className="mt-1"
                  placeholder="Notes on the decision..."
                />
              </div>

              {isAdmin && (
                <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Wand2 className="size-3.5" />
                    Demo Fill (Admin only)
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(["high", "average", "low"] as PerformerPreset[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPerformerPreset(p)}
                        className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors font-medium ${
                          performerPreset === p
                            ? "bg-amber-500 text-white border-amber-500"
                            : "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        }`}
                      >
                        {p === "high" ? "High Performer" : p === "average" ? "Average Performer" : "Low Performer"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={demoFill}
                    className="w-full text-xs border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 flex items-center justify-center gap-1.5 font-medium transition-colors"
                  >
                    <Wand2 className="size-3" />
                    Auto-fill all fields
                  </button>
                </div>
              )}

              {/* Tentative meeting dates — proposed alongside decision */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Propose Tentative Meeting Dates
                </Label>
                <p className="text-[10px] text-slate-400">
                  Both dates will be sent to HR to confirm one. Must be within 30 business days of today.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500">Option 1</Label>
                    <input
                      type="date"
                      value={tentDate1}
                      onChange={(e) => setTentDate1(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500">Option 2</Label>
                    <input
                      type="date"
                      value={tentDate2}
                      onChange={(e) => setTentDate2(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={submit} disabled={pending} className="w-full h-11">
                {pending ? "Recording..." : "Finalize Decision & Notify HR"}
              </Button>
            </CardContent>
          </Card>

          {/* Salary comparison */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <IndianRupee className="size-4 text-green-600" />
                Salary Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Current Gross</div>
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-200">₹{(grossAnnum / 100000).toFixed(2)}L</div>
                  <div className="text-[10px] text-slate-400">per annum</div>
                </div>
                <motion.div
                  key={newGross}
                  initial={{ scale: 0.95, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800"
                >
                  <div className="text-[10px] text-green-600 uppercase tracking-wider mb-1">After Hike</div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-400">₹{(newGross / 100000).toFixed(2)}L</div>
                  <div className="text-[10px] text-green-600">per annum</div>
                </motion.div>
              </div>
              <div className="flex items-center justify-between text-sm bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <span className="text-blue-600">Increment</span>
                <motion.span
                  key={increment}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  className="font-bold text-blue-700 dark:text-blue-400"
                >
                  +₹{increment.toLocaleString("en-IN")}/yr
                </motion.span>
              </div>
            </CardContent>
          </Card>

          {/* Ratings comparison */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitCompare className="size-4 text-purple-600" />
                Ratings Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {reviewerRatings.length === 0 && (
                <p className="text-xs text-slate-400">No ratings submitted yet.</p>
              )}
              {reviewerRatings.map((r) => {
                const revisedItems = r.criteriaBreakdown.filter((c) => c.revisedScore !== null);
                return (
                  <div key={r.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{r.role}</span>
                      <span className="text-[10px] text-slate-400">{r.reviewerName}</span>
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 ml-auto">{r.averageScore.toFixed(2)}</span>
                    </div>
                    {revisedItems.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic pl-1">No revisions</p>
                    ) : (
                      <div className="space-y-1">
                        {revisedItems.map((c) => (
                          <div key={c.name} className="flex items-center gap-2 text-[11px] bg-purple-50 dark:bg-purple-950/20 rounded px-2 py-1">
                            <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{c.name}</span>
                            <span className="text-slate-400 line-through">{c.score}</span>
                            <span className="text-purple-600 font-bold">→ {c.revisedScore}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
