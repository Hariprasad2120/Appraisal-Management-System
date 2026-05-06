"use client";

import { useState, useTransition } from "react";
import { createKpiCriterionAction, updateKpiCriterionAction } from "./criteria-actions";

type Dept = { id: string; name: string; parentId: string | null };

type Criterion = {
  id: string;
  name: string;
  description: string | null;
  departmentId: string;
  divisionId: string | null;
  weightage: number;
  ruleType: string;
  ruleConfig: unknown;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
};

const RULE_TYPE_LABELS: Record<string, string> = {
  TURNAROUND_TIME: "Turnaround Time",
  DUE_DATE: "Due Date",
  RECURRING_WEEKLY_DUE_DATE: "Recurring Weekly Due Date",
  MANUAL: "Manual",
  HYBRID: "Hybrid",
};

const RULE_TYPE_DEFAULTS: Record<string, object> = {
  TURNAROUND_TIME: {
    taskExamples: ["Bill Creation"],
    bands: [
      { maxHours: 12, rating: 5 },
      { maxHours: 24, rating: 4 },
      { maxHours: 48, rating: 3 },
      { maxHours: 72, rating: 2 },
    ],
    minRating: 1,
    graceMinutes: 30,
    requiresFileUpload: true,
    timerFreezesDuringReview: true,
    pauseRequiresTlApproval: true,
    partialCompletionMultiplier: 0.5,
    dailyAggregation: "AVERAGE_TASK_RATINGS_FOR_ASSIGNED_DAYS",
    monthlyAggregation: "AVERAGE_DAILY_RATINGS_WITH_TASKS_ONLY",
  },
  DUE_DATE: {
    earlyDaysForMax: 5,
    onDayRating: 4,
    lateDeductionPerDay: 1,
    minRating: 1,
  },
  RECURRING_WEEKLY_DUE_DATE: {
    weekday: 5,
    maxRating: 5,
    deductionPerDay: 1,
    minRating: 1,
  },
  MANUAL: {},
  HYBRID: {
    manualWeight: 0.5,
    ruleWeight: 0.5,
    ruleType: "TURNAROUND_TIME",
      ruleConfig: {
        taskExamples: ["Bill Creation"],
        bands: [
          { maxHours: 12, rating: 5 },
          { maxHours: 24, rating: 4 },
          { maxHours: 48, rating: 3 },
          { maxHours: 72, rating: 2 },
        ],
        minRating: 1,
        graceMinutes: 30,
        requiresFileUpload: true,
        timerFreezesDuringReview: true,
        pauseRequiresTlApproval: true,
        partialCompletionMultiplier: 0.5,
        dailyAggregation: "AVERAGE_TASK_RATINGS_FOR_ASSIGNED_DAYS",
        monthlyAggregation: "AVERAGE_DAILY_RATINGS_WITH_TASKS_ONLY",
      },
  },
};

function isoDate(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function CriteriaForm({
  departments,
  editing,
  onClose,
}: {
  departments: Dept[];
  editing?: Criterion | null;
  onClose?: () => void;
}) {
  const rootDepts = departments.filter((d) => !d.parentId);
  const divisionsByParent = new Map<string, Dept[]>();
  for (const d of departments) {
    if (d.parentId) {
      const arr = divisionsByParent.get(d.parentId) ?? [];
      arr.push(d);
      divisionsByParent.set(d.parentId, arr);
    }
  }

  const [deptId, setDeptId] = useState(editing?.departmentId ?? rootDepts[0]?.id ?? "");
  const [ruleType, setRuleType] = useState(editing?.ruleType ?? "MANUAL");
  const [ruleConfig, setRuleConfig] = useState(
    JSON.stringify(
      editing?.ruleConfig ??
        RULE_TYPE_DEFAULTS[editing?.ruleType ?? "MANUAL"] ??
        {},
      null,
      2,
    ),
  );
  const [configError, setConfigError] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const divisions = divisionsByParent.get(deptId) ?? [];

  function handleRuleTypeChange(newType: string) {
    setRuleType(newType);
    if (!editing) {
      setRuleConfig(JSON.stringify(RULE_TYPE_DEFAULTS[newType] ?? {}, null, 2));
    }
    setConfigError("");
  }

  function validateConfig(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setConfigError("Must be a JSON object");
        return false;
      }
      setConfigError("");
      return true;
    } catch {
      setConfigError("Invalid JSON");
      return false;
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateConfig(ruleConfig)) return;
    const fd = new FormData(e.currentTarget);
    fd.set("ruleConfig", ruleConfig);
    setError("");
    startTransition(async () => {
      try {
        if (editing) {
          await updateKpiCriterionAction(fd);
        } else {
          await createKpiCriterionAction(fd);
        }
        onClose?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Criterion Name *
          </label>
          <input
            name="name"
            defaultValue={editing?.name ?? ""}
            required
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. Invoice Turnaround Time"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Description
          </label>
          <textarea
            name="description"
            defaultValue={editing?.description ?? ""}
            rows={2}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Optional description of what this criterion measures"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Department *
          </label>
          {editing ? (
            <>
              <input type="hidden" name="departmentId" value={editing.departmentId} />
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {departments.find((d) => d.id === editing.departmentId)?.name ?? editing.departmentId}
                <span className="ml-2 text-xs">(cannot change after creation)</span>
              </p>
            </>
          ) : (
            <select
              name="departmentId"
              value={deptId}
              onChange={(e) => { setDeptId(e.target.value); }}
              className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {rootDepts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Division (optional)
          </label>
          <select
            name="divisionId"
            defaultValue={editing?.divisionId ?? ""}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All divisions (department-wide)</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Weightage % *
          </label>
          <input
            name="weightage"
            type="number"
            min="1"
            max="100"
            step="0.01"
            defaultValue={editing?.weightage ?? ""}
            required
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. 40"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Rule Type *
          </label>
          <select
            name="ruleType"
            value={ruleType}
            onChange={(e) => handleRuleTypeChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {Object.entries(RULE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Effective From
          </label>
          <input
            name="effectiveFrom"
            type="date"
            defaultValue={editing ? isoDate(editing.effectiveFrom) : ""}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Effective To
          </label>
          <input
            name="effectiveTo"
            type="date"
            defaultValue={editing ? isoDate(editing.effectiveTo) : ""}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">
              Rule Config (JSON) *
            </label>
            <button
              type="button"
              onClick={() =>
                setRuleConfig(JSON.stringify(RULE_TYPE_DEFAULTS[ruleType] ?? {}, null, 2))
              }
              className="text-xs text-primary hover:underline"
            >
              Reset to template
            </button>
          </div>
          <RuleConfigHint ruleType={ruleType} />
          <textarea
            rows={8}
            value={ruleConfig}
            onChange={(e) => {
              setRuleConfig(e.target.value);
              validateConfig(e.target.value);
            }}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            spellCheck={false}
          />
          {configError && (
            <p className="mt-1 text-xs text-red-500">{configError}</p>
          )}
        </div>
      </div>

      {editing && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          Editing a criterion resets its approval status to Pending — the TL will need to re-approve.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !!configError}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Saving…" : editing ? "Update Criterion" : "Create Criterion"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function RuleConfigHint({ ruleType }: { ruleType: string }) {
  const hints: Record<string, string> = {
    TURNAROUND_TIME:
      'bands: [{maxHours, rating}] sorted ascending. minRating for >last band. graceMinutes is the assignment grace before timer scoring starts.',
    DUE_DATE:
      'earlyDaysForMax: days early for rating 5. onDayRating: rating when completed on due day. lateDeductionPerDay: deducted per late day. minRating: floor.',
    RECURRING_WEEKLY_DUE_DATE:
      'weekday: 0=Sun…6=Sat. maxRating: rating when done by weekday. deductionPerDay: per working day late. minRating: floor.',
    MANUAL: 'No automatic rating. TL enters rating directly.',
    HYBRID:
      'manualWeight + ruleWeight should = 1. ruleType + ruleConfig define the automated component.',
  };
  const hint = hints[ruleType];
  if (!hint) return null;
  return (
    <p className="mb-1.5 text-[11px] text-muted-foreground">{hint}</p>
  );
}

export function CriteriaFormToggle({
  departments,
}: {
  departments: Dept[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        + New Criterion
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">New KPI Criterion</h3>
      <CriteriaForm departments={departments} onClose={() => setOpen(false)} />
    </div>
  );
}

export function CriteriaEditInline({
  criterion,
  departments,
}: {
  criterion: Criterion;
  departments: Dept[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        Edit
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">Edit Criterion</h3>
      <CriteriaForm editing={criterion} departments={departments} onClose={() => setOpen(false)} />
    </div>
  );
}
