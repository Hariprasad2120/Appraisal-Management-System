import { calculateCriterionPoints } from "@/lib/kpi";

type TimelineEvent = {
  eventType: string;
  actorRole: string;
  oldStatus: string | null;
  newStatus: string | null;
  timestamp: Date;
  reason: string | null;
  metadata: unknown;
  actor?: { name: string } | null;
};

type TimelineTask = {
  name: string;
  timerElapsedMinutes: number;
  assignedDate: Date;
  dueDate: Date | null;
  systemRating: number | null;
  finalRating: number | null;
  isPartialCompletion: boolean;
  ratingExplanation: string | null;
  criterion: {
    name: string;
    weightage: number;
    ruleType: string;
    ruleConfig: unknown;
  };
  events: TimelineEvent[];
};

type RuleConfigRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RuleConfigRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberFromMetadata(metadata: unknown, key: string): number | null {
  if (!isRecord(metadata)) return null;
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysDiff(from: Date, to: Date) {
  return Math.round((dateOnly(to).getTime() - dateOnly(from).getTime()) / 86_400_000);
}

export function formatKpiMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatHours(minutes: number) {
  return (Math.max(0, minutes) / 60).toFixed(2);
}

function formatWeekday(date: Date | null) {
  if (!date) return "the expected day";
  return date.toLocaleDateString("en-IN", { weekday: "long" });
}

function bandExplanation(task: TimelineTask, rating: number) {
  if (!isRecord(task.criterion.ruleConfig) || !Array.isArray(task.criterion.ruleConfig.bands)) return null;
  const bands = task.criterion.ruleConfig.bands
    .filter(isRecord)
    .map((band) => ({
      maxHours: typeof band.maxHours === "number" ? band.maxHours : null,
      rating: typeof band.rating === "number" ? band.rating : null,
    }))
    .filter((band): band is { maxHours: number; rating: number } => band.maxHours !== null && band.rating !== null)
    .sort((a, b) => a.maxHours - b.maxHours);
  const matchedIndex = bands.findIndex((band) => Math.abs(band.rating - rating) < 0.01);
  if (matchedIndex < 0) return null;
  const min = matchedIndex === 0 ? 0 : bands[matchedIndex - 1]!.maxHours;
  const max = bands[matchedIndex]!.maxHours;
  return `within the ${min}-${max} working hour band`;
}

export function buildKpiRatingExplanation(task: TimelineTask, systemRating: number, finalRating: number) {
  const completedAt = task.events.find((event) => event.eventType === "SUBMITTED")?.timestamp ?? null;
  const elapsedText = `${formatHours(task.timerElapsedMinutes)} working hours`;
  let base: string;

  switch (task.criterion.ruleType) {
    case "TURNAROUND_TIME": {
      const band = bandExplanation(task, systemRating);
      base = band
        ? `Rating ${systemRating.toFixed(2)} because task was completed in ${elapsedText}, ${band}.`
        : `Rating ${systemRating.toFixed(2)} because task was completed in ${elapsedText}.`;
      break;
    }
    case "DUE_DATE": {
      if (task.dueDate && completedAt) {
        const diff = daysDiff(task.dueDate, completedAt);
        if (diff === 0) {
          base = `Rating ${systemRating.toFixed(2)} because task was completed on the due date.`;
        } else if (diff < 0) {
          base = `Rating ${systemRating.toFixed(2)} because task was completed ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} before the due date.`;
        } else {
          base = `Rating ${systemRating.toFixed(2)} because task was completed ${diff} day${diff === 1 ? "" : "s"} after the due date.`;
        }
      } else {
        base = `Rating ${systemRating.toFixed(2)} based on due-date completion.`;
      }
      break;
    }
    case "RECURRING_WEEKLY_DUE_DATE":
      base = `Rating ${systemRating.toFixed(2)} because report was submitted on ${formatWeekday(completedAt)} against the weekly deadline.`;
      break;
    case "MANUAL":
      base = `Rating ${systemRating.toFixed(2)} based on TL manual review.`;
      break;
    case "HYBRID":
      base = `Rating ${systemRating.toFixed(2)} from the configured rule and TL manual review.`;
      break;
    default:
      base = `Rating ${systemRating.toFixed(2)} based on the configured KPI rule.`;
  }

  if (task.isPartialCompletion) {
    return `${base} System rating was ${systemRating.toFixed(2)}, but final rating is ${finalRating.toFixed(2)} because employee marked the task as partially completed.`;
  }
  return base;
}

export function buildKpiPointsExplanation(weightage: number, rating: number, monthlyTarget: number) {
  const points = calculateCriterionPoints(weightage, rating, monthlyTarget);
  return `Points calculated as ${monthlyTarget.toLocaleString("en-IN")} monthly target x ${weightage}% criterion weight x rating multiplier, resulting in ${Math.round(points).toLocaleString("en-IN")} points.`;
}

export function kpiEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    ASSIGNED: "Task assigned",
    STARTED: "Timer started",
    SUBMITTED: "Task submitted",
    PARTIALLY_COMPLETED: "Partial completion submitted",
    PAUSE_REQUESTED: "Pause requested",
    PAUSE_APPROVED: "Pause approved",
    PAUSE_REJECTED: "Pause rejected",
    PAUSED_BY_TL: "Task paused by TL",
    RESUMED: "Task resumed",
    REOPENED: "Task reopened",
    CLOSED_BY_TL: "Task closed by TL",
    RATING_CALCULATED: "Rating calculated",
    POINTS_CALCULATED: "Points calculated",
    ADMIN_OVERRIDE: "Admin override",
  };
  return labels[eventType] ?? eventType.replaceAll("_", " ").toLowerCase();
}

export function kpiEventDetail(event: TimelineEvent) {
  if (event.reason) return event.reason;
  const rating = numberFromMetadata(event.metadata, "rating") ?? numberFromMetadata(event.metadata, "finalRating");
  const systemRating = numberFromMetadata(event.metadata, "systemRating");
  const points = numberFromMetadata(event.metadata, "points");
  const elapsed = numberFromMetadata(event.metadata, "elapsedMinutesAdded");

  if (event.eventType === "RATING_CALCULATED" && rating !== null) {
    return systemRating !== null && Math.abs(systemRating - rating) > 0.001
      ? `System rating ${systemRating.toFixed(2)}, final rating ${rating.toFixed(2)}.`
      : `Final rating ${rating.toFixed(2)}.`;
  }
  if (event.eventType === "POINTS_CALCULATED" && points !== null) {
    return `${Math.round(points).toLocaleString("en-IN")} points recorded.`;
  }
  if ((event.eventType === "SUBMITTED" || event.eventType === "PAUSE_REQUESTED") && elapsed !== null) {
    return `${formatKpiMinutes(elapsed)} working time added.`;
  }
  if (event.oldStatus && event.newStatus && event.oldStatus !== event.newStatus) {
    return `${event.oldStatus.replaceAll("_", " ")} -> ${event.newStatus.replaceAll("_", " ")}.`;
  }
  return null;
}
