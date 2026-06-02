"use client";

import { useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  name: string;
  employeeNumber: number | null;
  department: string | null;
  joiningDate: string;
  grossAnnum: number | null;
  cycle: { id: string; type: string; status: string; startDate: string } | null;
  eligible: boolean;
  cycleType: string;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function AppraisalsMonthFilter({ rows }: { rows: Row[] }) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const filtered = selectedMonth === null
    ? []
    : rows.filter((r) => new Date(r.joiningDate).getMonth() === selectedMonth);

  // count per month for display
  const countByMonth = MONTHS.map((_, i) =>
    rows.filter((r) => new Date(r.joiningDate).getMonth() === i).length
  );

  return (
    <div className="space-y-3">
      {/* Month grid */}
      <div className="grid grid-cols-4 gap-1">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(selectedMonth === i ? null : i)}
            className={[
              "rounded-md py-1.5 text-xs font-medium transition-colors relative",
              selectedMonth === i
                ? "bg-[#008993] text-white"
                : countByMonth[i] > 0
                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#008993]/20"
                : "bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-default",
            ].join(" ")}
          >
            {m}
            {countByMonth[i] > 0 && (
              <span className={`absolute -top-1 -right-1 text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${
                selectedMonth === i ? "bg-white text-[#008993]" : "bg-[#008993] text-white"
              }`}>
                {countByMonth[i]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results */}
      {selectedMonth !== null && (
        <div className="space-y-1 mt-2">
          <div className="text-[10px] text-slate-400 font-medium mb-1.5">
            {MONTHS[selectedMonth]} — {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
          </div>
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400">No employees joined in {MONTHS[selectedMonth]}</p>
          ) : (
            filtered.map((r) => (
              <Link
                key={r.id}
                href={`/admin/employees/${r.id}/assign`}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-[#008993] transition-colors truncate">
                    {r.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    #{r.employeeNumber ?? "—"} · {new Date(r.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div className="shrink-0 ml-2">
                  {r.cycle ? (
                    <span className="text-[9px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
                      {r.cycle.status.replace(/_/g, " ")}
                    </span>
                  ) : r.eligible ? (
                    <span className="text-[9px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
                      {r.cycleType} due
                    </span>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                      Not due
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
