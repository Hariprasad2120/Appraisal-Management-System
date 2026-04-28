"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_OPTIONS = [
  "PENDING_SELF",
  "SELF_SUBMITTED",
  "AWAITING_AVAILABILITY",
  "RATING_IN_PROGRESS",
  "RATINGS_COMPLETE",
  "MANAGEMENT_REVIEW",
  "DATE_VOTING",
  "SCHEDULED",
  "DECIDED",
  "CLOSED",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MonthYearPicker({
  selectedMonth,
  selectedYear,
  onSelect,
  onClear,
}: {
  selectedMonth?: number;
  selectedYear?: number;
  onSelect: (month: number, year: number) => void;
  onClear: () => void;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(selectedYear ?? now.getFullYear());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasSelection = selectedMonth !== undefined && selectedYear !== undefined;
  const label = hasSelection
    ? `${MONTHS[selectedMonth - 1]} ${selectedYear}`
    : "Filter by month";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 border rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap",
          hasSelection
            ? "border-[#008993] bg-[#008993]/10 text-[#008993] font-medium"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-[#008993]",
        ].join(" ")}
      >
        <CalendarIcon className="size-4 shrink-0" />
        {label}
        {hasSelection && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
            onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onClear(), setOpen(false))}
            className="ml-1 hover:text-red-500 transition-colors"
          >
            <X className="size-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 w-64">
          {/* Year nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const isSelected = selectedMonth === i + 1 && selectedYear === viewYear;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { onSelect(i + 1, viewYear); setOpen(false); }}
                  className={[
                    "rounded-lg py-1.5 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-[#008993] text-white"
                      : "hover:bg-[#008993]/10 hover:text-[#008993] text-slate-600 dark:text-slate-400",
                  ].join(" ")}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryFilters({
  defaultQ,
  defaultMonth,
  defaultYear,
  defaultStatus,
  showSearch,
}: {
  defaultQ?: string;
  defaultMonth?: string;
  defaultYear?: string;
  defaultStatus?: string;
  showSearch?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQ ?? "");
  const [status, setStatus] = useState(defaultStatus ?? "");
  const [month, setMonth] = useState<number | undefined>(
    defaultMonth ? Number(defaultMonth) : undefined,
  );
  const [year, setYear] = useState<number | undefined>(
    defaultYear ? Number(defaultYear) : undefined,
  );

  function push(overrides: { q?: string; status?: string; month?: number | null; year?: number | null } = {}) {
    const params = new URLSearchParams();
    const sq = overrides.q !== undefined ? overrides.q : q;
    const ss = overrides.status !== undefined ? overrides.status : status;
    const sm = overrides.month !== undefined ? overrides.month : month;
    const sy = overrides.year !== undefined ? overrides.year : year;
    if (sq) params.set("q", sq);
    if (ss) params.set("status", ss);
    if (sm && sy) { params.set("month", String(sm)); params.set("year", String(sy)); }
    router.push(`/history?${params.toString()}`);
  }

  function handleDateSelect(m: number, y: number) {
    setMonth(m);
    setYear(y);
    push({ month: m, year: y });
  }

  function handleDateClear() {
    setMonth(undefined);
    setYear(undefined);
    push({ month: null, year: null });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    push();
  }

  function clearAll() {
    setQ("");
    setStatus("");
    setMonth(undefined);
    setYear(undefined);
    router.push("/history");
  }

  const hasFilters = q || status || month;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center">
      {showSearch && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name or Emp #"
          className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008993] w-48"
        />
      )}

      <MonthYearPicker
        selectedMonth={month}
        selectedYear={year}
        onSelect={handleDateSelect}
        onClear={handleDateClear}
      />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008993] text-slate-600 dark:text-slate-400"
      >
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="bg-[#008993] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#007880] transition-colors"
      >
        Filter
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-500 transition-colors"
        >
          <X className="size-3.5" /> Clear all
        </button>
      )}
    </form>
  );
}
