/**
 * KPI Rule Engine — pure functions only.
 * No DB calls, no side effects. Suitable for client or server use.
 */

// ---------------------------------------------------------------------------
// Config types per KpiRuleType
// ---------------------------------------------------------------------------

export type TurnaroundBand = { maxHours: number; rating: number };

export type TurnaroundTimeConfig = {
  bands: TurnaroundBand[];
  minRating: number;
  graceMinutes: number;
};

export type DueDateConfig = {
  earlyDaysForMax: number;
  onDayRating: number;
  lateDeductionPerDay: number;
  minRating: number;
};

export type RecurringWeeklyConfig = {
  weekday: number; // 0 = Sun … 6 = Sat
  maxRating: number;
  deductionPerDay: number;
  minRating: number;
};

export type HybridConfig = {
  manualWeight: number;
  ruleWeight: number;
  ruleType: string;
  ruleConfig: RuleConfig;
};

export type RuleConfig =
  | TurnaroundTimeConfig
  | DueDateConfig
  | RecurringWeeklyConfig
  | HybridConfig
  | Record<string, never>; // MANUAL

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type TaskRatingInput = {
  timerElapsedMinutes: number; // working minutes already counted (timer excluded pauses)
  dueDate: Date | null;
  assignedDate: Date;
  isPartialCompletion: boolean;
  completedAt: Date | null; // timestamp of SUBMITTED event; null = incomplete
  manualRating?: number | null; // for MANUAL and HYBRID manual component
};

// ---------------------------------------------------------------------------
// TURNAROUND_TIME
// ---------------------------------------------------------------------------

function rateTurnaround(
  task: TaskRatingInput,
  cfg: TurnaroundTimeConfig,
): number {
  const effectiveMinutes = Math.max(0, task.timerElapsedMinutes - cfg.graceMinutes);
  const elapsedHours = effectiveMinutes / 60;

  const sortedBands = [...cfg.bands].sort((a, b) => a.maxHours - b.maxHours);
  for (const band of sortedBands) {
    if (elapsedHours <= band.maxHours) return band.rating;
  }
  return cfg.minRating;
}

// ---------------------------------------------------------------------------
// DUE_DATE
// ---------------------------------------------------------------------------

function daysDiff(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function rateDueDate(task: TaskRatingInput, cfg: DueDateConfig): number {
  if (!task.dueDate || !task.completedAt) return cfg.minRating;

  const due = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate());
  const done = new Date(
    task.completedAt.getFullYear(),
    task.completedAt.getMonth(),
    task.completedAt.getDate(),
  );
  const diff = daysDiff(due, done); // negative = early, positive = late

  let rating: number;
  if (diff <= -cfg.earlyDaysForMax) {
    rating = 5;
  } else if (diff < 0) {
    // between earlyDaysForMax and 0 days early — linearly interpolate between onDayRating+1 and 5
    const earlyDays = Math.abs(diff);
    const fraction = earlyDays / cfg.earlyDaysForMax;
    rating = cfg.onDayRating + fraction * (5 - cfg.onDayRating);
  } else if (diff === 0) {
    rating = cfg.onDayRating;
  } else {
    rating = cfg.onDayRating - diff * cfg.lateDeductionPerDay;
  }

  return Math.max(cfg.minRating, Math.min(5, rating));
}

// ---------------------------------------------------------------------------
// RECURRING_WEEKLY_DUE_DATE
// ---------------------------------------------------------------------------

function nextWeekday(from: Date, weekday: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function rateRecurringWeekly(
  task: TaskRatingInput,
  cfg: RecurringWeeklyConfig,
): number {
  if (!task.completedAt) return cfg.minRating;

  const deadline = nextWeekday(task.assignedDate, cfg.weekday);
  const done = new Date(
    task.completedAt.getFullYear(),
    task.completedAt.getMonth(),
    task.completedAt.getDate(),
  );
  const lateDays = Math.max(0, daysDiff(deadline, done));

  const rating = cfg.maxRating - lateDays * cfg.deductionPerDay;
  return Math.max(cfg.minRating, Math.min(5, rating));
}

// ---------------------------------------------------------------------------
// HYBRID
// ---------------------------------------------------------------------------

function rateHybrid(task: TaskRatingInput, cfg: HybridConfig): number {
  const ruleRating = calculateTaskRating(
    task,
    cfg.ruleType,
    cfg.ruleConfig,
    false,
  );
  const manualRating = task.manualRating ?? 0;
  return cfg.manualWeight * manualRating + cfg.ruleWeight * ruleRating;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Compute system rating for a task given its rule type and config.
 * Pass `applyPartial = true` (default) to halve the rating when isPartialCompletion.
 * Returns a value in [1, 5] range (or exactly the minRating floor).
 */
export function calculateTaskRating(
  task: TaskRatingInput,
  ruleType: string,
  ruleConfig: RuleConfig,
  applyPartial = true,
): number {
  let rating: number;

  switch (ruleType) {
    case "TURNAROUND_TIME":
      rating = rateTurnaround(task, ruleConfig as TurnaroundTimeConfig);
      break;
    case "DUE_DATE":
      rating = rateDueDate(task, ruleConfig as DueDateConfig);
      break;
    case "RECURRING_WEEKLY_DUE_DATE":
      rating = rateRecurringWeekly(task, ruleConfig as RecurringWeeklyConfig);
      break;
    case "MANUAL":
      rating = task.manualRating ?? 0;
      break;
    case "HYBRID":
      rating = rateHybrid(task, ruleConfig as HybridConfig);
      break;
    default:
      rating = 0;
  }

  if (applyPartial && task.isPartialCompletion) {
    rating = rating / 2;
  }

  return Math.max(0, Math.min(5, rating));
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

/**
 * Average rating across all tasks for a single day / criterion slot.
 * Returns null when no tasks provided (no rating recorded yet).
 */
export function calculateDailyCriteriaRating(
  taskRatings: number[],
): number | null {
  if (taskRatings.length === 0) return null;
  const sum = taskRatings.reduce((a, b) => a + b, 0);
  return sum / taskRatings.length;
}

/**
 * Monthly rating = simple average of non-null daily ratings.
 * Returns null when no days have ratings yet.
 */
export function calculateMonthlyCriteriaRating(
  dailyRatings: (number | null)[],
): number | null {
  const valid = dailyRatings.filter((r): r is number => r !== null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return sum / valid.length;
}

function assignedDateKey(date: Date, timezone = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

/**
 * Monthly criterion rating for task-based KPI reviews:
 * 1. group closed tasks by the date they were assigned,
 * 2. average multiple task ratings inside each assigned day,
 * 3. average only the assigned days that have rated tasks.
 *
 * A task submitted on a later day still belongs to its assigned date.
 */
export function calculateAssignedDayMonthlyRating(
  tasks: Array<{ assignedDate: Date; finalRating: number | null }>,
  timezone = "Asia/Kolkata",
): number | null {
  const ratingsByAssignedDay = new Map<string, number[]>();
  for (const task of tasks) {
    if (task.finalRating === null || !Number.isFinite(task.finalRating)) continue;
    const key = assignedDateKey(task.assignedDate, timezone);
    ratingsByAssignedDay.set(key, [...(ratingsByAssignedDay.get(key) ?? []), task.finalRating]);
  }

  const dailyRatings = [...ratingsByAssignedDay.values()].map((ratings) => calculateDailyCriteriaRating(ratings));
  return calculateMonthlyCriteriaRating(dailyRatings);
}

/**
 * Validate a ruleConfig object shape for a given ruleType.
 * Returns an error string or null if valid.
 */
export function validateRuleConfig(
  ruleType: string,
  config: unknown,
): string | null {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return "ruleConfig must be a JSON object";
  }
  const c = config as Record<string, unknown>;

  switch (ruleType) {
    case "TURNAROUND_TIME": {
      if (!Array.isArray(c.bands) || c.bands.length === 0)
        return "TURNAROUND_TIME: bands array is required";
      for (const band of c.bands as unknown[]) {
        if (typeof band !== "object" || band === null) return "Each band must be an object";
        const b = band as Record<string, unknown>;
        if (typeof b.maxHours !== "number") return "Each band needs a numeric maxHours";
        if (typeof b.rating !== "number") return "Each band needs a numeric rating";
      }
      if (typeof c.minRating !== "number") return "TURNAROUND_TIME: minRating (number) is required";
      if (typeof c.graceMinutes !== "number") return "TURNAROUND_TIME: graceMinutes (number) is required";
      break;
    }
    case "DUE_DATE": {
      if (typeof c.earlyDaysForMax !== "number") return "DUE_DATE: earlyDaysForMax (number) is required";
      if (typeof c.onDayRating !== "number") return "DUE_DATE: onDayRating (number) is required";
      if (typeof c.lateDeductionPerDay !== "number") return "DUE_DATE: lateDeductionPerDay (number) is required";
      if (typeof c.minRating !== "number") return "DUE_DATE: minRating (number) is required";
      break;
    }
    case "RECURRING_WEEKLY_DUE_DATE": {
      if (typeof c.weekday !== "number" || c.weekday < 0 || c.weekday > 6)
        return "RECURRING_WEEKLY_DUE_DATE: weekday (0–6) is required";
      if (typeof c.maxRating !== "number") return "RECURRING_WEEKLY_DUE_DATE: maxRating (number) is required";
      if (typeof c.deductionPerDay !== "number") return "RECURRING_WEEKLY_DUE_DATE: deductionPerDay (number) is required";
      if (typeof c.minRating !== "number") return "RECURRING_WEEKLY_DUE_DATE: minRating (number) is required";
      break;
    }
    case "MANUAL":
      break;
    case "HYBRID": {
      if (typeof c.manualWeight !== "number") return "HYBRID: manualWeight (number) is required";
      if (typeof c.ruleWeight !== "number") return "HYBRID: ruleWeight (number) is required";
      if (typeof c.ruleType !== "string") return "HYBRID: ruleType (string) is required";
      const inner = validateRuleConfig(c.ruleType as string, c.ruleConfig);
      if (inner) return `HYBRID inner config — ${inner}`;
      break;
    }
    default:
      return `Unknown ruleType: ${ruleType}`;
  }
  return null;
}
