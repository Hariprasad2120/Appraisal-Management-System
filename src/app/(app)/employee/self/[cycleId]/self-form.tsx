"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitSelfAction } from "./actions";
import { motion } from "motion/react";
import { Wand2 } from "lucide-react";
import type { CriteriaCategory, SupplementarySection } from "@/lib/criteria";

type CategoryAnswer = {
  score: number;
  comment: string;
  questionAnswers?: Record<string, string>;
};

export function SelfForm({
  cycleId,
  categories,
  supplementary,
  existing,
  editableUntil,
  submittedAt,
  editCount,
}: {
  cycleId: string;
  categories: CriteriaCategory[];
  supplementary: SupplementarySection[];
  existing: Record<string, CategoryAnswer>;
  editableUntil: string;
  submittedAt: string | null;
  editCount: number;
}) {
  const employeeCategories = categories.filter((c) => !c.reviewerOnly);

  const [answers, setAnswers] = useState<Record<string, CategoryAnswer>>(() =>
    Object.fromEntries(
      employeeCategories.map((c) => [
        c.name,
        existing[c.name] ?? {
          score: 0,
          comment: "",
          questionAnswers: Object.fromEntries(c.questions.map((q) => [q, ""])),
        },
      ]),
    ),
  );

  const [suppAnswers, setSuppAnswers] = useState<Record<string, string>>(() => {
    const stored = (existing as Record<string, unknown>).__supplementary as Record<string, string> | undefined;
    const defaults: Record<string, string> = {};
    for (const sec of supplementary) {
      for (const q of sec.questions) {
        defaults[q.id] = stored?.[q.id] ?? "";
      }
    }
    return defaults;
  });

  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(!!submittedAt);
  const [reviewing, setReviewing] = useState(false);
  const [highlightedCriteria, setHighlightedCriteria] = useState<string | null>(null);
  const criteriaRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const router = useRouter();

  function scrollToMissed(catName: string) {
    const el = criteriaRefs.current[catName];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedCriteria(catName);
      setTimeout(() => setHighlightedCriteria(null), 2500);
    }
  }

  const deadline = new Date(editableUntil);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  function setScore(name: string, score: number) {
    setAnswers((prev) => ({ ...prev, [name]: { ...prev[name], score } }));
  }

  function setComment(name: string, comment: string) {
    setAnswers((prev) => ({ ...prev, [name]: { ...prev[name], comment } }));
  }

  function setQuestionAnswer(catName: string, question: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [catName]: {
        ...prev[catName],
        questionAnswers: { ...(prev[catName].questionAnswers ?? {}), [question]: value },
      },
    }));
  }

  function setSuppAnswer(id: string, value: string) {
    setSuppAnswers((prev) => ({ ...prev, [id]: value }));
  }

  type PerformerPreset = "high" | "average" | "low";
  const [performerPreset, setPerformerPreset] = useState<PerformerPreset>("high");

  function demoFill() {
    const multipliers: Record<PerformerPreset, number> = { high: 0.9, average: 0.65, low: 0.4 };
    const base = multipliers[performerPreset];
    const COMMENTS: Record<PerformerPreset, (cat: string) => string> = {
      high: (c) => `I consistently delivered high-quality results in ${c.toLowerCase()}, exceeding expectations.`,
      average: (c) => `I met expectations in ${c.toLowerCase()} and am working to improve further.`,
      low: (c) => `I faced challenges in ${c.toLowerCase()} and am actively seeking guidance to improve.`,
    };
    const QUESTION_ANSWER: Record<PerformerPreset, string> = {
      high: "I proactively took ownership, collaborated effectively, and delivered results ahead of schedule.",
      average: "I completed assigned tasks on time and collaborated with the team when needed.",
      low: "I completed the basic requirements but struggled with some areas that need improvement.",
    };
    const newAnswers: Record<string, CategoryAnswer> = {};
    employeeCategories.forEach((cat, i) => {
      const jitter = ((i % 3) - 1) * 0.05;
      const ratio = Math.min(1, Math.max(0.1, base + jitter));
      const score = Math.round(cat.maxPoints * ratio);
      const qAnswers: Record<string, string> = {};
      cat.questions.forEach((q) => { qAnswers[q] = QUESTION_ANSWER[performerPreset]; });
      newAnswers[cat.name] = { score, comment: COMMENTS[performerPreset](cat.name), questionAnswers: qAnswers };
    });
    setAnswers(newAnswers);
    const newSupp: Record<string, string> = {};
    for (const sec of supplementary) {
      for (const q of sec.questions) {
        if (q.numericOnly) {
          newSupp[q.id] = performerPreset === "high" ? "50000" : performerPreset === "average" ? "30000" : "15000";
        } else if (q.type === "choice" && q.choices) {
          newSupp[q.id] = q.choices[performerPreset === "high" ? 0 : performerPreset === "average" ? 1 : 2] ?? q.choices[0];
        } else {
          newSupp[q.id] = QUESTION_ANSWER[performerPreset];
        }
      }
    }
    setSuppAnswers(newSupp);
    toast.success("Demo data filled — review before submitting");
  }

  function submit() {
    for (const cat of employeeCategories) {
      const ans = answers[cat.name];
      for (const q of cat.questions) {
        if (!ans.questionAnswers?.[q]?.trim()) {
          toast.error(`Answer all questions in: ${cat.name}`, {
            action: { label: "Go there", onClick: () => scrollToMissed(cat.name) },
          });
          scrollToMissed(cat.name);
          return;
        }
      }
      if (!ans?.comment?.trim()) {
        toast.error(`Add summary comment for: ${cat.name}`, {
          action: { label: "Go there", onClick: () => scrollToMissed(cat.name) },
        });
        scrollToMissed(cat.name);
        return;
      }
    }
    for (const sec of supplementary) {
      for (const q of sec.questions) {
        if (!suppAnswers[q.id]?.trim()) {
          toast.error(`Answer all questions in Part ${sec.part}: ${sec.title}`);
          return;
        }
        if (q.numericOnly && !/^\d+$/.test(suppAnswers[q.id].trim())) {
          toast.error(`"${q.text.split("?")[0]}?" — enter numbers only`);
          return;
        }
      }
    }
    startTransition(async () => {
      const payload = { ...answers, __supplementary: suppAnswers };
      const res = await submitSelfAction({ cycleId, answers: payload });
      if (!res.ok) { toast.error(res.error); return; }
      const deadlineStr = new Date(res.editableUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      toast.success(
        submitted
          ? `Changes saved! You can edit until ${deadlineStr}.`
          : `Successfully submitted! You have 3 business days to review and edit (until ${deadlineStr}).`,
        { duration: 8000 },
      );
      setSubmitted(true);
      setReviewing(false);
      router.refresh();
    });
  }

  const totalScore = employeeCategories.reduce((s, c) => s + (answers[c.name]?.score ?? 0), 0);
  const totalMax = employeeCategories.reduce((s, c) => s + c.maxPoints, 0);

  // Progress calculation
  const totalFields = employeeCategories.reduce((s, c) => {
    // comment + each question
    return s + 1 + c.questions.length;
  }, 0) + supplementary.reduce((s, sec) => s + sec.questions.length, 0);

  const filledFields = employeeCategories.reduce((s, c) => {
    const ans = answers[c.name];
    let count = 0;
    if (ans?.comment?.trim()) count++;
    for (const q of c.questions) {
      if (ans?.questionAnswers?.[q]?.trim()) count++;
    }
    return s + count;
  }, 0) + supplementary.reduce((s, sec) => {
    return s + sec.questions.filter((q) => suppAnswers[q.id]?.trim()).length;
  }, 0);

  const progressPct = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400 font-medium">Form Progress</span>
          <span className={`font-bold text-lg ${progressPct === 100 ? "text-green-600" : "text-blue-600"}`}>
            {progressPct}%
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct === 100 ? "bg-green-500" : "bg-blue-600"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{filledFields} / {totalFields} fields completed</span>
          <span>Self-score: {totalScore} / {totalMax}</span>
        </div>
      </div>

      {/* Part A */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 px-1">
          Part A — Performance Self-Assessment
        </h2>
        <div className="space-y-4">
          {employeeCategories.map((cat, idx) => {
            const ans = answers[cat.name] ?? { score: 0, comment: "", questionAnswers: {} };
            const isHighlighted = highlightedCriteria === cat.name;
            return (
              <motion.div
                key={cat.name}
                ref={(el) => { criteriaRefs.current[cat.name] = el; }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-4 transition-all duration-500 ${
                  isHighlighted
                    ? "border-amber-400 shadow-lg shadow-amber-100 dark:shadow-amber-900/20 ring-2 ring-amber-300 dark:ring-amber-600"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{cat.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{cat.items.join(" · ")}</div>
                  </div>
                  <span className="shrink-0 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full px-2 py-0.5">
                    max {cat.maxPoints} pts
                  </span>
                </div>

                <div className="space-y-3">
                  {cat.questions.map((question, qIdx) => (
                    <div key={qIdx} className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {qIdx + 1}. {question}
                      </label>
                      <Textarea
                        value={ans.questionAnswers?.[question] ?? ""}
                        onChange={(e) => setQuestionAnswer(cat.name, question, e.target.value)}
                        rows={2}
                        placeholder="Your answer..."
                        className="resize-none text-sm"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Self-rating</span>
                    <span className="font-bold text-blue-600">{ans.score} / {cat.maxPoints}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={cat.maxPoints}
                    step={1}
                    value={ans.score}
                    onChange={(e) => setScore(cat.name, Number(e.target.value))}
                    className="w-full accent-blue-600 h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0</span>
                    <span>{Math.round(cat.maxPoints / 2)}</span>
                    <span>{cat.maxPoints}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Summary / Justification for self-rating
                  </label>
                  <Textarea
                    value={ans.comment}
                    onChange={(e) => setComment(cat.name, e.target.value)}
                    rows={2}
                    placeholder={`Summarize your performance in ${cat.name.toLowerCase()}...`}
                    className="resize-none text-sm"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Parts B, C, D — supplementary sections */}
      {supplementary.map((sec, secIdx) => (
        <motion.div
          key={sec.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (employeeCategories.length + secIdx) * 0.04 }}
          className="space-y-3"
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 px-1">
            Part {sec.part} — {sec.title}
          </h2>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
            {sec.questions.map((q, qIdx) => (
              <div key={q.id} className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {qIdx + 1}. {q.text}
                </label>
                {q.type === "choice" && q.choices ? (
                  <div className="space-y-1.5 pl-1">
                    {q.choices.map((choice) => (
                      <label
                        key={choice}
                        className="flex items-start gap-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={choice}
                          checked={suppAnswers[q.id] === choice}
                          onChange={() => setSuppAnswer(q.id, choice)}
                          className="mt-0.5 accent-blue-600 shrink-0"
                        />
                        <span className={`text-xs ${suppAnswers[q.id] === choice ? "text-blue-600 font-medium" : "text-slate-600 dark:text-slate-400"}`}>
                          {choice}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : q.numericOnly ? (
                  <div className="space-y-1">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={suppAnswers[q.id] ?? ""}
                      onChange={(e) => setSuppAnswer(q.id, e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Enter amount in ₹..."
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-400">Numbers only — enter annual amount in rupees</p>
                  </div>
                ) : (
                  <Textarea
                    value={suppAnswers[q.id] ?? ""}
                    onChange={(e) => setSuppAnswer(q.id, e.target.value)}
                    rows={2}
                    placeholder="Your answer..."
                    className="resize-none text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Submission status banner */}
      {submitted && !reviewing && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Successfully submitted your appraisal form</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                Review & edit deadline: <strong>{deadline.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining` : "Edit window closes today"}
                {editCount > 0 ? ` · Edited ${editCount} time${editCount !== 1 ? "s" : ""}` : ""}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setReviewing(true)}
            variant="outline"
            className="w-full h-9 border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-400"
          >
            Review / Edit Form
          </Button>
        </motion.div>
      )}

      {(!submitted || reviewing) && (
        <div className="space-y-3">
          {submitted && reviewing && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Edit window closes: <strong>{deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
              {editCount > 0 && ` · ${editCount} edit${editCount !== 1 ? "s" : ""} made`}
            </div>
          )}

          {/* Demo Fill */}
          <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <Wand2 className="size-3.5" />
              Demo Fill — auto-fill all fields
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

          <Button onClick={submit} disabled={pending} className="w-full h-11">
            {pending
              ? (submitted ? "Saving..." : "Submitting...")
              : submitted
              ? "Save Changes"
              : "Submit Self-Assessment"}
          </Button>
        </div>
      )}
    </div>
  );
}
