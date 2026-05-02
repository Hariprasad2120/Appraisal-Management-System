"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitRatingReviewAction } from "./rating-review-actions";
import { ClipboardEdit, ChevronDown, ChevronUp } from "lucide-react";

type CategoryScore = { name: string; score: number; maxPoints: number };
type ExistingReview = { criteriaName: string; revisedScore: number; justification: string; updatedAt: string };

export function RatingReviewForm({
  ratingId,
  cycleId,
  categoryScores,
  existingReviews,
}: {
  ratingId: string;
  cycleId: string;
  categoryScores: CategoryScore[];
  existingReviews: ExistingReview[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState("");
  const [revisedScore, setRevisedScore] = useState(0);
  const [justification, setJustification] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = categoryScores.find((c) => c.name === selectedCriteria);

  function handleCriteriaChange(name: string | null) {
    if (!name) return;
    setSelectedCriteria(name);
    // Pre-fill with existing review if any
    const existing = existingReviews.find((r) => r.criteriaName === name);
    if (existing) {
      setRevisedScore(existing.revisedScore);
      setJustification(existing.justification);
    } else {
      const cat = categoryScores.find((c) => c.name === name);
      setRevisedScore(cat?.score ?? 0);
      setJustification("");
    }
  }

  function submit() {
    if (!selectedCriteria) { toast.error("Select a criteria"); return; }
    if (!justification.trim()) { toast.error("Justification required"); return; }
    if (!selected) return;
    startTransition(async () => {
      const res = await submitRatingReviewAction({
        ratingId,
        cycleId,
        criteriaName: selectedCriteria,
        originalScore: selected.score,
        revisedScore,
        justification: justification.trim(),
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Review rating saved — original submission unchanged");
      setSelectedCriteria("");
      setJustification("");
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
      >
        <ClipboardEdit className="size-3.5" />
        Submit review rating (revised criteria score)
      </button>
    );
  }

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-purple-400">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <ClipboardEdit className="size-4" />
            Review Rating
          </CardTitle>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
            <ChevronUp className="size-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Stored as separate review layer. Does NOT overwrite original submission.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing reviews */}
        {existingReviews.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-400">Submitted Reviews</p>
            {existingReviews.map((r) => {
              const cat = categoryScores.find((c) => c.name === r.criteriaName);
              return (
                <div key={r.criteriaName} className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{r.criteriaName}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 line-through">{cat?.score ?? "—"}</span>
                      <span className="text-purple-600 font-bold">→ {r.revisedScore}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">{r.justification}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Select criteria */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Select Criteria</label>
          <Select value={selectedCriteria} onValueChange={handleCriteriaChange}>
            <SelectTrigger className="w-full h-auto min-h-[2.25rem] py-1.5">
              <SelectValue placeholder="Choose criteria to revise..." />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--select-trigger-width,280px)] max-w-none">
              {categoryScores.map((c) => {
                const hasReview = existingReviews.some((r) => r.criteriaName === c.name);
                return (
                  <SelectItem key={c.name} value={c.name} className="py-2.5 whitespace-normal">
                    <span className="block text-sm leading-snug">
                      {c.name}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      Original: {c.score}/{c.maxPoints}{hasReview ? " · revised ✓" : ""}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Revised Score</span>
                <span className="font-bold text-purple-600">{revisedScore} / {selected.maxPoints}</span>
              </div>
              <input
                type="range"
                min={0}
                max={selected.maxPoints}
                step={0.5}
                value={revisedScore}
                onChange={(e) => setRevisedScore(Number(e.target.value))}
                className="w-full accent-purple-600 h-2"
              />
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>0</span>
                <span className="text-slate-400">Original: {selected.score}</span>
                <span>{selected.maxPoints}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Justification <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Explain why you are revising this score..."
                className="resize-none text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={submit} disabled={pending} className="bg-purple-600 hover:bg-purple-700">
                {pending ? "Saving..." : "Save Review Rating"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
