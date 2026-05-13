"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitRatingDisagreementAction } from "./rating-disagreement-actions";
import { ThumbsUp, ThumbsDown, Minus, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type EvalOption = "ACCURATE" | "OVERRATED" | "UNDERRATED";

type CategoryScore = { name: string; score: number; maxPoints: number };

type ExistingDisagreement = {
  evaluation: EvalOption;
  comment: string | null;
  revisedScores: Record<string, number> | null;
  ceilingMin: number | null;
  ceilingMax: number | null;
};

const EVAL_CONFIG: Record<EvalOption, { label: string; shortLabel: string; color: string; icon: React.ReactNode }> = {
  ACCURATE: {
    label: "Accurate",
    shortLabel: "✓",
    color: "border-green-400 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400",
    icon: <ThumbsUp className="size-3" />,
  },
  OVERRATED: {
    label: "Overrated",
    shortLabel: "↓",
    color: "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
    icon: <ThumbsDown className="size-3" />,
  },
  UNDERRATED: {
    label: "Underrated",
    shortLabel: "↑",
    color: "border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
    icon: <ThumbsUp className="size-3" />,
  },
};

export function RatingDisagreementForm({
  ratingId,
  cycleId,
  categoryScores,
  existing,
}: {
  ratingId: string;
  cycleId: string;
  categoryScores: CategoryScore[];
  existing: ExistingDisagreement | null;
}) {
  const [open, setOpen] = useState(false);

  // Per-criteria evaluation state — default all to ACCURATE
  const [criteriaEvals, setCriteriaEvals] = useState<Record<string, EvalOption>>(
    Object.fromEntries(categoryScores.map((c) => [c.name, "ACCURATE" as EvalOption]))
  );
  const [criteriaRevisedScores, setCriteriaRevisedScores] = useState<Record<string, number>>(
    Object.fromEntries(categoryScores.map((c) => [c.name, c.score]))
  );
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [pending, startTransition] = useTransition();

  // Derive overall evaluation from per-criteria selections
  const overallEval: EvalOption = (() => {
    const vals = Object.values(criteriaEvals);
    if (vals.some((v) => v === "OVERRATED")) return "OVERRATED";
    if (vals.some((v) => v === "UNDERRATED")) return "UNDERRATED";
    return "ACCURATE";
  })();

  const needsComment = overallEval !== "ACCURATE";

  function setCriteriaEval(name: string, val: EvalOption) {
    setCriteriaEvals((prev) => ({ ...prev, [name]: val }));
  }

  function setCriteriaRevised(name: string, val: number) {
    setCriteriaRevisedScores((prev) => ({ ...prev, [name]: val }));
  }

  function submit() {
    if (needsComment && !comment.trim()) {
      toast.error("Comment required when criteria are marked Overrated or Underrated");
      return;
    }
    const nonAccurateCriteria = categoryScores.filter((c) => criteriaEvals[c.name] !== "ACCURATE");
    const revisedScores = nonAccurateCriteria.length > 0
      ? Object.fromEntries(nonAccurateCriteria.map((c) => [c.name, criteriaRevisedScores[c.name] ?? c.score]))
      : undefined;

    startTransition(async () => {
      const res = await submitRatingDisagreementAction({
        ratingId,
        cycleId,
        evaluation: overallEval,
        comment: comment.trim() || undefined,
        revisedScores,
        criteriaEvaluations: criteriaEvals,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Rating evaluation saved");
      setOpen(false);
    });
  }

  const savedCfg = existing ? EVAL_CONFIG[existing.evaluation] : null;

  return (
    <div>
      {/* Summary pill if already submitted */}
      {existing && !open && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 mb-2 ${savedCfg?.color}`}>
          {savedCfg?.icon}
          <span className="text-xs font-semibold">{savedCfg?.label}</span>
          {existing.ceilingMin !== null && existing.ceilingMax !== null && (
            <span className="text-[10px] ml-1 opacity-80">
              Range: ₹{Number(existing.ceilingMin).toLocaleString()} – ₹{Number(existing.ceilingMax).toLocaleString()}
            </span>
          )}
          <button
            onClick={() => setOpen(true)}
            className="ml-auto text-[10px] underline opacity-70 hover:opacity-100"
          >
            Edit
          </button>
        </div>
      )}

      {!open && !existing && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          <Minus className="size-3.5" />
          Evaluate criteria (Accurate / Overrated / Underrated)
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="border-0 shadow-sm border-l-4 border-l-orange-400">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertCircle className="size-4" />
                    Per-Criteria Evaluation
                  </CardTitle>
                  <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <ChevronUp className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mark each criterion. Overall evaluation auto-derives from your selections. Does not auto-change payout — sets negotiation ceiling.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Per-criteria rows */}
                <div className="space-y-2">
                  {categoryScores.map((c) => {
                    const eval_ = criteriaEvals[c.name] ?? "ACCURATE";
                    const isNonAccurate = eval_ !== "ACCURATE";
                    return (
                      <div
                        key={c.name}
                        className={`rounded-lg border p-3 transition-colors ${
                          eval_ === "ACCURATE" ? "border-slate-200 dark:border-slate-700"
                          : eval_ === "OVERRATED" ? "border-red-300 bg-red-50/50 dark:bg-red-950/10"
                          : "border-blue-300 bg-blue-50/50 dark:bg-blue-950/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs flex-1 font-medium text-slate-700 dark:text-slate-300 truncate">
                            {c.name}
                            <span className="text-[10px] text-slate-400 font-normal ml-1">({c.score}/{c.maxPoints})</span>
                          </span>
                          <div className="flex gap-1 shrink-0">
                            {(["ACCURATE", "OVERRATED", "UNDERRATED"] as EvalOption[]).map((opt) => {
                              const cfg = EVAL_CONFIG[opt];
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setCriteriaEval(c.name, opt)}
                                  title={cfg.label}
                                  className={`flex items-center gap-0.5 px-2 py-1 rounded border text-[10px] font-semibold transition-all ${
                                    eval_ === opt
                                      ? cfg.color + " border-current"
                                      : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-400"
                                  }`}
                                >
                                  {cfg.icon}
                                  {cfg.shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Revised score input for non-accurate */}
                        {isNonAccurate && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">Revised score:</span>
                            <input
                              type="number"
                              min={0}
                              max={c.maxPoints}
                              step={0.5}
                              value={criteriaRevisedScores[c.name] ?? c.score}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) setCriteriaRevised(c.name, v);
                              }}
                              className="w-14 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-xs bg-white dark:bg-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-orange-400"
                            />
                            <span className="text-[10px] text-slate-400">/{c.maxPoints}</span>
                            <span className="text-[10px] text-slate-400 line-through">{c.score}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overall derived evaluation summary */}
                <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${EVAL_CONFIG[overallEval].color}`}>
                  {EVAL_CONFIG[overallEval].icon}
                  <span className="text-xs font-semibold">Overall: {EVAL_CONFIG[overallEval].label}</span>
                  <span className="text-[10px] opacity-70 ml-1">(auto-derived from criteria)</span>
                </div>

                {/* Comment — mandatory for OVER/UNDER */}
                {needsComment && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Justification <span className="text-red-400">*</span>
                    </label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="Explain why specific criteria are over/underrated..."
                      className="resize-none text-sm"
                    />
                    <p className="text-[10px] text-slate-400">Visible in appraisal discussion. Does not affect system score.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={submit}
                    disabled={pending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {pending ? "Saving..." : "Save Evaluation"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
