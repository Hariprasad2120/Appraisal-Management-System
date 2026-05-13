"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CycleEntry = {
  employeeId: string;
  employeeName: string;
  cycleId: string;
  status: string;
  type: string;
  startDate: string; // ISO
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_SELF: "bg-orange-400",
  SELF_SUBMITTED: "bg-amber-400",
  AWAITING_AVAILABILITY: "bg-yellow-400",
  RATING_IN_PROGRESS: "bg-blue-400",
  RATINGS_COMPLETE: "bg-cyan-400",
  MANAGEMENT_REVIEW: "bg-cyan-400",
  DATE_VOTING: "bg-indigo-400",
  SCHEDULED: "bg-purple-400",
  DECIDED: "bg-green-400",
};

export function AppraisalCalendar({ cycles }: { cycles: CycleEntry[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
    setSelected(null);
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
    setSelected(null);
  }

  const cyclesOnDay = (day: Date) =>
    cycles.filter((c) => isSameDay(new Date(c.startDate), day));

  const selectedCycles = selected ? cyclesOnDay(selected) : [];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = viewDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{monthName}</span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-slate-400 gap-0.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const date = new Date(year, month, day);
          const dayCycles = cyclesOnDay(date);
          const isToday = isSameDay(date, today);
          const isSelected = selected ? isSameDay(date, selected) : false;

          return (
            <button
              key={idx}
              onClick={() => setSelected(isSelected ? null : date)}
              className={[
                "relative rounded-md py-1.5 text-xs flex flex-col items-center gap-0.5 transition-colors",
                isSelected
                  ? "bg-[#008993]/20 ring-1 ring-[#008993]"
                  : isToday
                  ? "bg-[#008993]/10"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800",
                dayCycles.length > 0 ? "font-semibold" : "font-normal",
                isToday ? "text-[#008993]" : "text-slate-700 dark:text-slate-300",
              ].join(" ")}
            >
              <span>{day}</span>
              {dayCycles.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {dayCycles.slice(0, 3).map((c) => (
                    <span
                      key={c.cycleId}
                      className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[c.status] ?? "bg-slate-400"}`}
                    />
                  ))}
                  {dayCycles.length > 3 && (
                    <span className="text-[9px] text-slate-400">+{dayCycles.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-1">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {status.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      {/* Selected day detail */}
      {selected && selectedCycles.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-1.5 mt-2">
          <div className="text-xs font-medium text-slate-500 mb-2">
            {selected.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            {" — "}
            {selectedCycles.length} appraisal{selectedCycles.length > 1 ? "s" : ""}
          </div>
          {selectedCycles.map((c) => (
            <a
              key={c.cycleId}
              href={`/workspace/hrms/employees/${c.employeeId}/assign`}
              className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-[#008993] transition-colors">
                  {c.employeeName}
                </div>
                <div className="text-[10px] text-slate-400">
                  {c.type} · {c.status.replace(/_/g, " ")}
                </div>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[c.status] ?? "bg-slate-400"}`} />
            </a>
          ))}
        </div>
      )}

      {selected && selectedCycles.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">
          No appraisals on {selected.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </p>
      )}
    </div>
  );
}
