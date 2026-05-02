"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveCriteriaOverrideAction, resetCriteriaOverrideAction } from "./actions";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import type { CriteriaCategory } from "@/lib/criteria";

type QuestionEntry = { id: number; text: string };

type Override = { categoryName: string; questions: string[]; maxPoints?: number } | null;

export function CriteriaEditor({
  category,
  existingOverride,
  onMaxPointsChange,
}: {
  category: CriteriaCategory;
  existingOverride: Override;
  onMaxPointsChange?: (pts: number) => void;
  reviewerOnly?: boolean;
}) {
  const nextId = useRef(0);
  const baseQuestions = existingOverride ? existingOverride.questions : [...category.questions];
  const [questions, setQuestions] = useState<QuestionEntry[]>(() =>
    baseQuestions.map((text, i) => ({ id: i + 1, text })),
  );
  useEffect(() => {
    nextId.current = questions.length + 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [maxPoints, setMaxPoints] = useState<number>(
    existingOverride?.maxPoints ?? category.maxPoints,
  );
  const isReviewerOnly = category.reviewerOnly ?? false;
  const [savePending, startSave] = useTransition();
  const [resetPending, startReset] = useTransition();

  const isModified =
    maxPoints !== category.maxPoints ||
    JSON.stringify(questions.map((q) => q.text).filter((q) => q.trim())) !== JSON.stringify(category.questions);
  const hasOverride = !!existingOverride;

  function addQuestion() {
    setQuestions((prev) => [...prev, { id: nextId.current++, text: "" }]);
  }

  function removeQuestion(id: number) {
    const confirmed = window.confirm(
      "Remove this question from the category? This change is not saved until you click Save Changes.",
    );
    if (!confirmed) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: number, val: string) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, text: val } : q)));
  }

  function handleMaxPointsChange(val: string) {
    const n = parseInt(val, 10);
    const pts = !isNaN(n) && n > 0 ? n : 0;
    setMaxPoints(pts);
    onMaxPointsChange?.(pts > 0 ? pts : category.maxPoints);
  }

  function save() {
    const filtered = questions.map((q) => q.text.trim()).filter(Boolean);
    if (filtered.length === 0 && !isReviewerOnly) {
      toast.error("At least one question required");
      return;
    }
    if (maxPoints < 1) {
      toast.error("Max points must be at least 1");
      return;
    }
    startSave(async () => {
      const res = await saveCriteriaOverrideAction({
        categoryName: category.name,
        questions: filtered,
        maxPoints,
      });
      if (res.ok) toast.success("Questions saved");
      else toast.error(res.error ?? "Failed");
    });
  }

  function reset() {
    startReset(async () => {
      const res = await resetCriteriaOverrideAction(category.name);
      if (res.ok) {
        nextId.current = category.questions.length + 1;
        setQuestions(category.questions.map((text, i) => ({ id: i + 1, text })));
        setMaxPoints(category.maxPoints);
        toast.success("Reset to defaults");
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  const pointsChanged = maxPoints !== category.maxPoints;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
              {category.name}
            </CardTitle>
            <p className="text-[10px] text-slate-400 mt-0.5">{category.items.join(" · ")}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasOverride && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                Custom
              </span>
            )}
            {/* Editable max points */}
            <div className="flex items-center gap-1">
              <label className="text-[10px] text-slate-400 whitespace-nowrap">Max pts</label>
              <input
                type="number"
                min={1}
                max={500}
                value={maxPoints || ""}
                onChange={(e) => handleMaxPointsChange(e.target.value)}
                className={[
                  "w-14 text-xs text-center rounded-md border px-1.5 py-0.5 font-semibold",
                  "focus:outline-none focus:ring-1 focus:ring-[#008993]",
                  pointsChanged
                    ? "border-[#008993] bg-[#008993]/10 text-[#008993]"
                    : "border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300",
                ].join(" ")}
              />
              {pointsChanged && (
                <span className="text-[10px] text-slate-400">
                  was {category.maxPoints}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {questions.map((q, displayIdx) => (
            <div key={q.id} className="flex gap-2">
              <div className="shrink-0 text-[10px] text-slate-400 mt-2.5 w-5 text-right">{displayIdx + 1}.</div>
              <Textarea
                value={q.text}
                onChange={(e) => updateQuestion(q.id, e.target.value)}
                rows={2}
                placeholder={`Question ${displayIdx + 1}...`}
                className="resize-none text-sm flex-1"
              />
              <button
                type="button"
                onClick={() => removeQuestion(q.id)}
                className="shrink-0 p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Remove question"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-1.5 text-xs text-[#008993] hover:text-[#00cec4] transition-colors"
        >
          <Plus className="size-3.5" /> Add question
        </button>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={save}
            disabled={savePending || !isModified}
          >
            {savePending ? "Saving..." : "Save Changes"}
          </Button>
          {hasOverride && (
            <Button
              size="sm"
              variant="outline"
              onClick={reset}
              disabled={resetPending}
              className="gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              {resetPending ? "Resetting..." : "Reset to Default"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
