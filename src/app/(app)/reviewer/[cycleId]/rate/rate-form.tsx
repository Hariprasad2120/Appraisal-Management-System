"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitRatingAction } from "./actions";
import { motion } from "motion/react";
import { Info, Wand2 } from "lucide-react";
import type { CriteriaCategory } from "@/lib/criteria";
import { GRADE_BANDS } from "@/lib/criteria";
import { AlertCircle } from "lucide-react";

type PerformerPreset = "high" | "average" | "low";

type Score = number | "AVERAGE_OUT";

export function RateForm({
  cycleId,
  role,
  categories,
  totalMaxPoints,
  peerRatingExists,
  isAdmin = false,
}: {
  cycleId: string;
  role: "HR" | "TL" | "MANAGER";
  categories: CriteriaCategory[];
  totalMaxPoints: number;
  peerRatingExists: boolean;
  isAdmin?: boolean;
}) {
  const [scores, setScores] = useState<Record<string, Score>>(
    Object.fromEntries(categories.map((c) => [c.name, 0])),
  );
  const [catComments, setCatComments] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((c) => [c.name, ""])),
  );
  const [overallComments, setOverallComments] = useState("");
  const [pending, startTransition] = useTransition();
  const [highlightedCriteria, setHighlightedCriteria] = useState<string | null>(null);
  const router = useRouter();
  const criteriaRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [performerPreset, setPerformerPreset] = useState<PerformerPreset>("high");
  const isTL = role === "TL";

  function demoFill() {
    const multipliers: Record<PerformerPreset, number> = { high: 0.9, average: 0.65, low: 0.4 };
    const base = multipliers[performerPreset];
    const DEMO_COMMENTS: Record<PerformerPreset, string> = {
      high: "Consistently exceeds expectations with outstanding quality of work.",
      average: "Meets expectations reliably; shows good potential for growth.",
      low: "Requires improvement in key areas; additional support recommended.",
    };
    const CAT_COMMENTS: Record<PerformerPreset, (cat: string) => string> = {
      high: (c) => `Strong performance in ${c.toLowerCase()}. Sets a benchmark for the team.`,
      average: (c) => `Adequate performance in ${c.toLowerCase()}. Room for further development.`,
      low: (c) => `Needs focused improvement in ${c.toLowerCase()}. Coaching recommended.`,
    };
    // Vary scores slightly across categories for realism
    const newScores: Record<string, Score> = {};
    categories.forEach((cat, i) => {
      const jitter = ((i % 3) - 1) * 0.07;
      const ratio = Math.min(1, Math.max(0.1, base + jitter));
      newScores[cat.name] = Math.round(cat.maxPoints * ratio * 2) / 2;
    });
    setScores(newScores);
    const newCatComments: Record<string, string> = {};
    categories.forEach((cat) => { newCatComments[cat.name] = CAT_COMMENTS[performerPreset](cat.name); });
    setCatComments(newCatComments);
    setOverallComments(DEMO_COMMENTS[performerPreset]);
    toast.success("Demo data filled — review before submitting");
  }

  function setScore(name: string, value: Score) {
    if (value === "AVERAGE_OUT") {
      if (isTL) { toast.error("TLs cannot use Average Out"); return; }
      if (!peerRatingExists) {
        toast.error("Average Out requires at least one peer to have already rated");
        return;
      }
    }
    setScores((prev) => ({ ...prev, [name]: value }));
  }

  function setCatComment(name: string, value: string) {
    setCatComments((prev) => ({ ...prev, [name]: value }));
  }

  const totalRaw = categories.reduce((s, c) => {
    const v = scores[c.name];
    return s + (v === "AVERAGE_OUT" ? 0 : (v as number));
  }, 0);
  const normalizedScore = (totalRaw / totalMaxPoints) * 100;
  const normalizedPreview = normalizedScore.toFixed(1);

  const currentGrade = GRADE_BANDS.find(
    (b) => normalizedScore >= b.minNormalized && normalizedScore <= b.maxNormalized,
  ) ?? null;

  const gradeColorMap: Record<string, string> = {
    "A+": "text-emerald-600 bg-emerald-50 border-emerald-200",
    "A": "text-green-600 bg-green-50 border-green-200",
    "B+": "text-blue-600 bg-blue-50 border-blue-200",
    "B": "text-sky-600 bg-sky-50 border-sky-200",
    "C+": "text-yellow-600 bg-yellow-50 border-yellow-200",
    "C": "text-orange-600 bg-orange-50 border-orange-200",
    "D": "text-red-600 bg-red-50 border-red-200",
  };

  function scrollToMissed(catName: string) {
    const el = criteriaRefs.current[catName];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedCriteria(catName);
      setTimeout(() => setHighlightedCriteria(null), 2500);
    }
  }

  function submit() {
    // Check for unrated criteria first
    for (const cat of categories) {
      const v = scores[cat.name];
      if (v !== "AVERAGE_OUT" && (typeof v !== "number" || v === 0)) {
        toast.error(`Rate criteria: ${cat.name}`, {
          action: { label: "Go there", onClick: () => scrollToMissed(cat.name) },
        });
        scrollToMissed(cat.name);
        return;
      }
    }
    if (!overallComments.trim()) {
      toast.error("Overall comments are required");
      return;
    }
    for (const cat of categories) {
      if (!catComments[cat.name]?.trim()) {
        toast.error(`Add comment for: ${cat.name}`, {
          action: { label: "Go there", onClick: () => scrollToMissed(cat.name) },
        });
        scrollToMissed(cat.name);
        return;
      }
    }
    const hasAO = Object.values(scores).some((s) => s === "AVERAGE_OUT");
    if (hasAO && !peerRatingExists) {
      toast.error("Cannot use Average Out — no peer has rated yet");
      return;
    }
    startTransition(async () => {
      const numericScores = Object.fromEntries(
        Object.entries(scores).map(([k, v]) => [k, v === "AVERAGE_OUT" ? -1 : v]),
      );
      // Merge per-category comments into the overall comments payload
      const fullComments = [
        overallComments,
        ...categories.map((c) =>
          catComments[c.name]?.trim()
            ? `[${c.name}]: ${catComments[c.name].trim()}`
            : null,
        ).filter(Boolean),
      ].join("\n\n");

      const res = await submitRatingAction({
        cycleId,
        role,
        scores: numericScores,
        comments: fullComments,
        hasAverageOut: hasAO,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Rating submitted — thank you!");
      router.push(`/reviewer/${cycleId}`);
      router.refresh();
    });
  }

  const completedCount = categories.filter((c) => {
    const v = scores[c.name];
    return v === "AVERAGE_OUT" || (typeof v === "number" && v > 0);
  }).length;
  const totalCount = categories.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your Rating</span>
            <span className="text-[10px] text-slate-500">{completedCount}/{totalCount} criteria rated</span>
          </div>
          <div className="flex items-center gap-3">
            {currentGrade && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${gradeColorMap[currentGrade.grade] ?? "bg-slate-50 border-slate-200 text-slate-600"}`}>
                {currentGrade.grade} · {currentGrade.label}
              </span>
            )}
            <div className="text-right">
              <div className="text-xl font-bold text-[#008993]">{normalizedPreview}</div>
              <div className="text-[10px] text-slate-400">/ 100</div>
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#008993] transition-all duration-300"
            style={{ width: `${Math.min(parseFloat(normalizedPreview), 100)}%` }}
          />
        </div>
        <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Criteria progress: {completedCount}/{totalCount}</span>
          <span>Raw: {totalRaw} / {totalMaxPoints} pts</span>
        </div>
      </div>

      {/* Full score card (non-sticky reference) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 space-y-3">
        {currentGrade && (
          <div className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-3 ${gradeColorMap[currentGrade.grade] ?? "bg-slate-50 border-slate-200 text-slate-600"}`}>
            <div className="flex items-center gap-2">
              <span className="text-base font-black">{currentGrade.grade}</span>
              <div>
                <div className="text-xs font-semibold leading-tight">{currentGrade.label}</div>
                <div className="text-[10px] opacity-70">Score {currentGrade.minNormalized}–{currentGrade.maxNormalized}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] opacity-70">
              <AlertCircle className="size-3" />
              Increments are decided by Admin/Management
            </div>
          </div>
        )}
      </div>

      {/* Per-category cards */}
      {categories.map((cat, idx) => {
        const score = scores[cat.name];
        const isAO = score === "AVERAGE_OUT";
        const isHighlighted = highlightedCriteria === cat.name;

        return (
          <motion.div
            key={cat.name}
            ref={(el) => { criteriaRefs.current[cat.name] = el; }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-3 transition-all duration-500 ${
              isHighlighted
                ? "border-amber-400 shadow-lg shadow-amber-100 dark:shadow-amber-900/20 ring-2 ring-amber-300 dark:ring-amber-600"
                : "border-slate-200 dark:border-slate-700"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  {cat.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{cat.items.join(" · ")}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isTL && peerRatingExists && (
                  <button
                    type="button"
                    onClick={() => setScore(cat.name, isAO ? 0 : "AVERAGE_OUT")}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                      isAO
                        ? "bg-amber-100 text-amber-700 border-amber-300"
                        : "text-slate-400 border-slate-200 hover:border-amber-300 hover:text-amber-600"
                    }`}
                  >
                    {isAO ? "✓ Avg Out" : "Avg Out"}
                  </button>
                )}
                {!isAO && (
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[3.5rem] text-right">
                    {score as number} / {cat.maxPoints}
                  </span>
                )}
              </div>
            </div>

            {/* Slider */}
            {!isAO ? (
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={cat.maxPoints}
                  step={0.5}
                  value={score as number}
                  onChange={(e) => setScore(cat.name, Number(e.target.value))}
                  className="w-full accent-[#008993] h-2"
                />
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>0</span>
                  <span>{Math.round(cat.maxPoints / 2)}</span>
                  <span>{cat.maxPoints}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
                Will be averaged with peer scores after all reviewers submit.
              </p>
            )}

            {/* Per-category comment */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Comment for this criterion
              </label>
              <Textarea
                value={catComments[cat.name] ?? ""}
                onChange={(e) => setCatComment(cat.name, e.target.value)}
                rows={2}
                placeholder={`Observations on ${cat.name.toLowerCase()}...`}
                className="resize-none text-xs"
              />
            </div>
          </motion.div>
        );
      })}

      {/* Overall comments */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
        <label className="text-sm font-semibold text-slate-900 dark:text-white">
          Overall Assessment
        </label>
        <Textarea
          value={overallComments}
          onChange={(e) => setOverallComments(e.target.value)}
          rows={4}
          placeholder="Overall observations, strengths, areas for improvement..."
          className="resize-none"
        />
      </div>

      {isTL && (
        <div className="flex gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          As TL, Average Out is not available to you.
        </div>
      )}

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
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors font-medium capitalize ${
                  performerPreset === p
                    ? "bg-amber-500 text-white border-amber-500"
                    : "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                }`}
              >
                {p === "high" ? "High Performer" : p === "average" ? "Average Performer" : "Low Performer"}
              </button>
            ))}
          </div>
          <Button
            type="button"
            onClick={demoFill}
            variant="outline"
            size="sm"
            className="w-full text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400"
          >
            <Wand2 className="size-3 mr-1.5" />
            Auto-fill all fields
          </Button>
        </div>
      )}

      <Button onClick={submit} disabled={pending} className="w-full h-11">
        {pending ? "Submitting..." : "Submit Rating"}
      </Button>
      <p className="text-xs text-slate-400 text-center">
        Ratings are locked after submission.
      </p>
    </div>
  );
}
