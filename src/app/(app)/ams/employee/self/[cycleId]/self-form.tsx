"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitSelfAction } from "./actions";
import type { CriteriaCategory, SupplementarySection } from "@/lib/criteria";

type CategoryAnswer = {
  score: number;
  comment: string;
  questionAnswers?: Record<string, string>;
};

type WizardStep =
  | { id: string; kind: "category"; title: string; subtitle: string; category: CriteriaCategory }
  | { id: string; kind: "supplementary"; title: string; subtitle: string; section: SupplementarySection };

type PerformerPreset = "high" | "average" | "low";

export function SelfForm({
  cycleId,
  categories,
  supplementary,
  existing,
  editableUntil,
  submittedAt,
  lastModifiedAt,
  editCount,
  selfStatus,
  editable,
}: {
  cycleId: string;
  categories: CriteriaCategory[];
  supplementary: SupplementarySection[];
  existing: Record<string, CategoryAnswer>;
  editableUntil: string;
  submittedAt: string | null;
  lastModifiedAt: string | null;
  editCount: number;
  selfStatus: string;
  editable: boolean;
}) {
  const employeeCategories = useMemo(
    () => categories.filter((c) => !c.reviewerOnly),
    [categories],
  );

  const steps = useMemo<WizardStep[]>(
    () => [
      ...employeeCategories.map((category, index) => ({
        id: `category:${category.name}`,
        kind: "category" as const,
        title: category.name,
        subtitle: `Step ${index + 1}: ${category.items.join(", ")}`,
        category,
      })),
      ...supplementary.map((section, index) => ({
        id: `supplementary:${section.part}:${section.title}`,
        kind: "supplementary" as const,
        title: section.title,
        subtitle: `Part ${section.part} - Additional reflection ${index + 1}`,
        section,
      })),
    ],
    [employeeCategories, supplementary],
  );

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
      for (const q of sec.questions) defaults[q.id] = stored?.[q.id] ?? "";
    }
    return defaults;
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(!!submittedAt);
  const [formOpen, setFormOpen] = useState(!submittedAt);
  const [reviewing, setReviewing] = useState(false);
  const [highlightedCriteria, setHighlightedCriteria] = useState<string | null>(null);
  const criteriaRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const router = useRouter();

  const isLocked = !editable;
  const deadline = new Date(editableUntil);
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const step = steps[Math.min(currentStep, Math.max(steps.length - 1, 0))];
  const showSubmittedReview = submitted && formOpen && !reviewing;
  const statusText = selfStatus.replace(/_/g, " ").toLowerCase();

  const totalScore = employeeCategories.reduce((s, c) => s + (answers[c.name]?.score ?? 0), 0);
  const totalMax = employeeCategories.reduce((s, c) => s + c.maxPoints, 0);
  const totalFields =
    employeeCategories.reduce((s, c) => s + 1 + c.questions.length, 0) +
    supplementary.reduce((s, sec) => s + sec.questions.length, 0);
  const filledFields =
    employeeCategories.reduce((s, c) => {
      const ans = answers[c.name];
      let count = ans?.comment?.trim() ? 1 : 0;
      for (const q of c.questions) {
        if (ans?.questionAnswers?.[q]?.trim()) count++;
      }
      return s + count;
    }, 0) +
    supplementary.reduce(
      (s, sec) => s + sec.questions.filter((q) => suppAnswers[q.id]?.trim()).length,
      0,
    );
  const progressPct = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  function scrollToMissed(catName: string) {
    const targetIndex = steps.findIndex((candidate) => candidate.kind === "category" && candidate.category.name === catName);
    if (targetIndex >= 0) setCurrentStep(targetIndex);
    window.setTimeout(() => {
      criteriaRefs.current[catName]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedCriteria(catName);
      window.setTimeout(() => setHighlightedCriteria(null), 2500);
    }, 80);
  }

  function setScore(name: string, score: number) {
    if (isLocked) return;
    setAnswers((prev) => ({ ...prev, [name]: { ...prev[name], score } }));
  }

  function setComment(name: string, comment: string) {
    if (isLocked) return;
    setAnswers((prev) => ({ ...prev, [name]: { ...prev[name], comment } }));
  }

  function setQuestionAnswer(catName: string, question: string, value: string) {
    if (isLocked) return;
    setAnswers((prev) => ({
      ...prev,
      [catName]: {
        ...prev[catName],
        questionAnswers: { ...(prev[catName].questionAnswers ?? {}), [question]: value },
      },
    }));
  }

  function setSuppAnswer(id: string, value: string) {
    if (isLocked) return;
    setSuppAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function validateStep(candidate: WizardStep, announce = true): boolean {
    if (candidate.kind === "category") {
      const cat = candidate.category;
      const ans = answers[cat.name];
      for (const q of cat.questions) {
        if (!ans?.questionAnswers?.[q]?.trim()) {
          if (announce) {
            toast.error(`Answer all questions in: ${cat.name}`);
            scrollToMissed(cat.name);
          }
          return false;
        }
      }
      if (!ans?.comment?.trim()) {
        if (announce) {
          toast.error(`Add summary comment for: ${cat.name}`);
          scrollToMissed(cat.name);
        }
        return false;
      }
      return true;
    }

    for (const q of candidate.section.questions) {
      if (!suppAnswers[q.id]?.trim()) {
        if (announce) toast.error(`Answer all questions in Part ${candidate.section.part}: ${candidate.section.title}`);
        return false;
      }
      if (q.numericOnly && !/^\d+$/.test(suppAnswers[q.id].trim())) {
        if (announce) toast.error(`"${q.text.split("?")[0]}?" - enter numbers only`);
        return false;
      }
    }
    return true;
  }

  function validateAll(): boolean {
    return steps.every((candidate) => validateStep(candidate, true));
  }

  function goNext() {
    if (!step) return;
    if (!isLocked && !validateStep(step)) return;
    setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
  }

  function demoFill() {
    if (isLocked) return;
    const multipliers: Record<PerformerPreset, number> = { high: 0.9, average: 0.65, low: 0.4 };
    const comments: Record<PerformerPreset, (cat: string) => string> = {
      high: (c) => `I consistently delivered high-quality results in ${c.toLowerCase()}, exceeding expectations.`,
      average: (c) => `I met expectations in ${c.toLowerCase()} and am working to improve further.`,
      low: (c) => `I faced challenges in ${c.toLowerCase()} and am actively seeking guidance to improve.`,
    };
    const questionAnswer: Record<PerformerPreset, string> = {
      high: "I proactively took ownership, collaborated effectively, and delivered results ahead of schedule.",
      average: "I completed assigned tasks on time and collaborated with the team when needed.",
      low: "I completed the basic requirements but struggled with some areas that need improvement.",
    };
    const newAnswers: Record<string, CategoryAnswer> = {};
    employeeCategories.forEach((cat, index) => {
      const ratio = Math.min(1, Math.max(0.1, multipliers[performerPreset] + ((index % 3) - 1) * 0.05));
      newAnswers[cat.name] = {
        score: Math.round(cat.maxPoints * ratio),
        comment: comments[performerPreset](cat.name),
        questionAnswers: Object.fromEntries(cat.questions.map((q) => [q, questionAnswer[performerPreset]])),
      };
    });
    setAnswers(newAnswers);

    const newSupp: Record<string, string> = {};
    for (const sec of supplementary) {
      for (const q of sec.questions) {
        if (q.numericOnly) newSupp[q.id] = performerPreset === "high" ? "50000" : performerPreset === "average" ? "30000" : "15000";
        else if (q.type === "choice" && q.choices) newSupp[q.id] = q.choices[performerPreset === "high" ? 0 : performerPreset === "average" ? 1 : 2] ?? q.choices[0];
        else newSupp[q.id] = questionAnswer[performerPreset];
      }
    }
    setSuppAnswers(newSupp);
    toast.success("Demo data filled - review before submitting");
  }

  const [performerPreset, setPerformerPreset] = useState<PerformerPreset>("high");

  function submit() {
    if (isLocked) {
      toast.error("Edit window has closed - form is read-only.");
      return;
    }
    if (!validateAll()) return;
    startTransition(async () => {
      const payload = { ...answers, __supplementary: suppAnswers };
      const res = await submitSelfAction({ cycleId, answers: payload });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const deadlineStr = new Date(res.editableUntil).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      toast.success(submitted ? "Changes saved" : "Thank you for your submission", {
        description: submitted
          ? `You can edit until ${deadlineStr}.`
          : `You have 3 business days to review and edit it until ${deadlineStr}.`,
        duration: 5000,
      });
      setSubmitted(true);
      setReviewing(false);
      setFormOpen(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {submitted && (
        <SubmittedBanner
          isLocked={isLocked}
          deadline={deadline}
          lastModifiedAt={lastModifiedAt}
          editCount={editCount}
          daysLeft={daysLeft}
          formOpen={formOpen}
          onToggleView={() => {
            setFormOpen((value) => !value);
            setReviewing(false);
          }}
          onEdit={() => {
            setFormOpen(true);
            setReviewing(true);
          }}
        />
      )}

      {formOpen && (
        showSubmittedReview ? (
          <SubmittedReview
            employeeCategories={employeeCategories}
            supplementary={supplementary}
            answers={answers}
            suppAnswers={suppAnswers}
            totalScore={totalScore}
            totalMax={totalMax}
            statusText={statusText}
          />
        ) : (
          <div className="space-y-5">
            <ProgressPanel
              progressPct={progressPct}
              filledFields={filledFields}
              totalFields={totalFields}
              totalScore={totalScore}
              totalMax={totalMax}
              currentStep={currentStep}
              steps={steps}
              onStepClick={(index) => setCurrentStep(index)}
            />

            {step && (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="ds-label text-primary">Step {currentStep + 1} of {steps.length}</p>
                    <h2 className="mt-1 text-lg font-normal text-foreground">{step.title}</h2>
                    <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                  </div>
                  <span className="w-fit rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                    {step.kind === "category" ? `Max ${step.category.maxPoints} pts` : `Part ${step.section.part}`}
                  </span>
                </div>

                {step.kind === "category" ? (
                  <CategoryStep
                    category={step.category}
                    answer={answers[step.category.name] ?? { score: 0, comment: "", questionAnswers: {} }}
                    isLocked={isLocked}
                    highlighted={highlightedCriteria === step.category.name}
                    setRef={(el) => { criteriaRefs.current[step.category.name] = el; }}
                    onScore={setScore}
                    onComment={setComment}
                    onQuestionAnswer={setQuestionAnswer}
                  />
                ) : (
                  <SupplementaryStep
                    section={step.section}
                    answers={suppAnswers}
                    isLocked={isLocked}
                    onAnswer={setSuppAnswer}
                  />
                )}
              </motion.div>
            )}

            <WizardControls
              isLocked={isLocked}
              currentStep={currentStep}
              stepsLength={steps.length}
              pending={pending}
              submitted={submitted}
              onPrevious={() => setCurrentStep((value) => Math.max(0, value - 1))}
              onNext={goNext}
              onSubmit={submit}
            />

            {!isLocked && (
              <DemoFill
                performerPreset={performerPreset}
                setPerformerPreset={setPerformerPreset}
                onFill={demoFill}
              />
            )}

            {submitted && !isLocked && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                Edit window closes: <strong>{deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                {editCount > 0 ? ` - ${editCount} edit${editCount !== 1 ? "s" : ""} made` : ""}
              </p>
            )}

            {isLocked && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Form is read-only. Editing closed on {deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}

function SubmittedBanner({
  isLocked,
  deadline,
  lastModifiedAt,
  editCount,
  daysLeft,
  formOpen,
  onToggleView,
  onEdit,
}: {
  isLocked: boolean;
  deadline: Date;
  lastModifiedAt: string | null;
  editCount: number;
  daysLeft: number;
  formOpen: boolean;
  onToggleView: () => void;
  onEdit: () => void;
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 space-y-3 ${
      isLocked
        ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
        : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${isLocked ? "bg-slate-400" : "bg-green-500"}`}>
          {isLocked ? <Lock className="size-4 text-white" /> : <CheckCircle2 className="size-4 text-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isLocked ? "text-slate-700 dark:text-slate-300" : "text-green-800 dark:text-green-300"}`}>
            {isLocked ? "Self-assessment submitted - deadline passed" : "Self-assessment submitted"}
          </p>
          <p className={`mt-0.5 text-xs ${isLocked ? "text-slate-500" : "text-green-700 dark:text-green-400"}`}>
            {isLocked
              ? `Locked on ${deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} - view only`
              : `Edit deadline: ${deadline.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
          </p>
          {lastModifiedAt && (
            <p className="mt-0.5 text-[10px] text-slate-400">
              Last saved: {new Date(lastModifiedAt).toLocaleString("en-IN")}
              {editCount > 0 ? ` - ${editCount} edit${editCount !== 1 ? "s" : ""} made` : ""}
            </p>
          )}
          {!isLocked && (
            <p className="mt-0.5 text-xs text-green-600 dark:text-green-500">
              {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining to edit` : "Edit window closes today"}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onToggleView} className="h-9 flex-1 text-sm">
          {formOpen ? "Hide Form" : "View Form"}
        </Button>
        {!isLocked && (
          <Button type="button" onClick={onEdit} className="h-9 flex-1 text-sm">
            Edit Form
          </Button>
        )}
      </div>
    </div>
  );
}

function ProgressPanel({
  progressPct,
  filledFields,
  totalFields,
  totalScore,
  totalMax,
  currentStep,
  steps,
  onStepClick,
}: {
  progressPct: number;
  filledFields: number;
  totalFields: number;
  totalScore: number;
  totalMax: number;
  currentStep: number;
  steps: WizardStep[];
  onStepClick: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-muted-foreground">Form Progress</span>
        <span className={`text-lg font-bold ${progressPct === 100 ? "text-green-600" : "text-primary"}`}>
          {progressPct}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{filledFields} / {totalFields} fields completed</span>
        <span>Self-score: {totalScore} / {totalMax}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {steps.map((candidate, index) => (
          <button
            key={candidate.id}
            type="button"
            title={candidate.title}
            onClick={() => onStepClick(index)}
            className={`size-2.5 rounded-full transition-all ${
              index === currentStep
                ? "w-7 bg-primary"
                : index < currentStep
                ? "bg-green-500"
                : "bg-border hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to step ${index + 1}: ${candidate.title}`}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryStep({
  category,
  answer,
  isLocked,
  highlighted,
  setRef,
  onScore,
  onComment,
  onQuestionAnswer,
}: {
  category: CriteriaCategory;
  answer: CategoryAnswer;
  isLocked: boolean;
  highlighted: boolean;
  setRef: (el: HTMLDivElement | null) => void;
  onScore: (name: string, score: number) => void;
  onComment: (name: string, comment: string) => void;
  onQuestionAnswer: (catName: string, question: string, value: string) => void;
}) {
  return (
    <div
      ref={setRef}
      className={`rounded-xl border bg-card p-4 space-y-4 transition-all duration-500 ${
        highlighted ? "border-amber-400 ring-2 ring-amber-300 dark:ring-amber-600" : "border-border"
      } ${isLocked ? "opacity-80" : ""}`}
    >
      <div className="space-y-3">
        {category.questions.map((question, index) => (
          <div key={question} className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {index + 1}. {question}
            </label>
            <Textarea
              value={answer.questionAnswers?.[question] ?? ""}
              onChange={(e) => onQuestionAnswer(category.name, question, e.target.value)}
              rows={3}
              placeholder="Your answer..."
              className="resize-none text-sm"
              disabled={isLocked}
              readOnly={isLocked}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-border pt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Self-rating</span>
          <span className="font-bold text-primary">{answer.score} / {category.maxPoints}</span>
        </div>
        <input
          type="range"
          min={0}
          max={category.maxPoints}
          step={1}
          value={answer.score}
          onChange={(e) => onScore(category.name, Number(e.target.value))}
          className={`h-2 w-full ${isLocked ? "accent-slate-400 cursor-not-allowed" : "accent-primary"}`}
          disabled={isLocked}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span>{Math.round(category.maxPoints / 2)}</span>
          <span>{category.maxPoints}</span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          Summary / Justification for self-rating
        </label>
        <Textarea
          value={answer.comment}
          onChange={(e) => onComment(category.name, e.target.value)}
          rows={3}
          placeholder={`Summarize your performance in ${category.name.toLowerCase()}...`}
          className="resize-none text-sm"
          disabled={isLocked}
          readOnly={isLocked}
        />
      </div>
    </div>
  );
}

function SupplementaryStep({
  section,
  answers,
  isLocked,
  onAnswer,
}: {
  section: SupplementarySection;
  answers: Record<string, string>;
  isLocked: boolean;
  onAnswer: (id: string, value: string) => void;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 space-y-4 ${isLocked ? "opacity-80" : ""}`}>
      {section.questions.map((question, index) => (
        <div key={question.id} className="space-y-1.5">
          <label className="whitespace-pre-line text-xs font-medium text-foreground">
            {index + 1}. {question.text}
          </label>
          {question.type === "choice" && question.choices ? (
            <div className="space-y-1.5 pl-1">
              {question.choices.map((choice) => (
                <label key={choice} className={`flex items-start gap-2 ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  <input
                    type="radio"
                    name={question.id}
                    value={choice}
                    checked={answers[question.id] === choice}
                    onChange={() => onAnswer(question.id, choice)}
                    className="mt-0.5 shrink-0 accent-primary"
                    disabled={isLocked}
                  />
                  <span className={`text-xs ${answers[question.id] === choice ? "font-medium text-primary" : "text-muted-foreground"}`}>
                    {choice}
                  </span>
                </label>
              ))}
            </div>
          ) : question.numericOnly ? (
            <div className="space-y-1">
              <input
                type="number"
                min={0}
                step={1}
                value={answers[question.id] ?? ""}
                onChange={(e) => onAnswer(question.id, e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Enter amount in rupees..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLocked}
                readOnly={isLocked}
              />
              <p className="text-[10px] text-muted-foreground">Numbers only - enter annual amount in rupees</p>
            </div>
          ) : (
            <Textarea
              value={answers[question.id] ?? ""}
              onChange={(e) => onAnswer(question.id, e.target.value)}
              rows={3}
              placeholder="Your answer..."
              className="resize-none text-sm"
              disabled={isLocked}
              readOnly={isLocked}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function WizardControls({
  isLocked,
  currentStep,
  stepsLength,
  pending,
  submitted,
  onPrevious,
  onNext,
  onSubmit,
}: {
  isLocked: boolean;
  currentStep: number;
  stepsLength: number;
  pending: boolean;
  submitted: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const isFinal = currentStep >= stepsLength - 1;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 0}
        className="h-10 gap-2"
      >
        <ArrowLeft className="size-4" />
        Previous
      </Button>
      {isFinal ? (
        <Button type="button" onClick={onSubmit} disabled={pending || isLocked} className="h-10 gap-2">
          {pending ? (submitted ? "Saving..." : "Submitting...") : submitted ? "Save Changes" : "Submit"}
          <CheckCircle2 className="size-4" />
        </Button>
      ) : (
        <Button type="button" onClick={onNext} className="h-10 gap-2">
          Next
          <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}

function DemoFill({
  performerPreset,
  setPerformerPreset,
  onFill,
}: {
  performerPreset: PerformerPreset;
  setPerformerPreset: (value: PerformerPreset) => void;
  onFill: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 space-y-2 dark:border-amber-700 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Wand2 className="size-3.5" />
        Demo Fill - auto-fill all fields
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["high", "average", "low"] as PerformerPreset[]).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setPerformerPreset(preset)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
              performerPreset === preset
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-amber-300 text-amber-600 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
            }`}
          >
            {preset === "high" ? "High Performer" : preset === "average" ? "Average Performer" : "Low Performer"}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onFill}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
      >
        <Wand2 className="size-3" />
        Auto-fill all fields
      </button>
    </div>
  );
}

function SubmittedReview({
  employeeCategories,
  supplementary,
  answers,
  suppAnswers,
  totalScore,
  totalMax,
  statusText,
}: {
  employeeCategories: CriteriaCategory[];
  supplementary: SupplementarySection[];
  answers: Record<string, CategoryAnswer>;
  suppAnswers: Record<string, string>;
  totalScore: number;
  totalMax: number;
  statusText: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="ds-label text-primary">Submitted Review</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-normal text-foreground">Completed self-assessment</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 capitalize text-muted-foreground">{statusText}</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              {totalScore} / {totalMax}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {employeeCategories.map((category) => {
          const answer = answers[category.name] ?? { score: 0, comment: "", questionAnswers: {} };
          return (
            <div key={category.name} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{category.name}</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{category.items.join(", ")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {answer.score} / {category.maxPoints}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {category.questions.map((question, index) => (
                  <div key={question}>
                    <p className="text-[11px] font-medium text-muted-foreground">{index + 1}. {question}</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 px-3 py-2 text-xs text-foreground">
                      {answer.questionAnswers?.[question] || "-"}
                    </p>
                  </div>
                ))}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Summary</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 px-3 py-2 text-xs text-foreground">
                    {answer.comment || "-"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {supplementary.map((section) => (
          <div key={`${section.part}:${section.title}`} className="rounded-xl border border-border bg-card p-4">
            <p className="ds-label text-primary">Part {section.part}</p>
            <h3 className="mt-1 text-sm font-semibold text-foreground">{section.title}</h3>
            <div className="mt-3 space-y-3">
              {section.questions.map((question, index) => (
                <div key={question.id}>
                  <p className="whitespace-pre-line text-[11px] font-medium text-muted-foreground">
                    {index + 1}. {question.text}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 px-3 py-2 text-xs text-foreground">
                    {suppAnswers[question.id] || "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
