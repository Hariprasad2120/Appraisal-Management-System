"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

type ChartEntry = { name: string; score: number; hike: number };
type StatusEntry = { status: string; count: number; label: string };

const STATUS_COLORS: Record<string, string> = {
  PENDING_SELF: "#64748b",
  SELF_SUBMITTED: "#3b82f6",
  AWAITING_AVAILABILITY: "#eab308",
  RATING_IN_PROGRESS: "#f97316",
  RATINGS_COMPLETE: "#22c55e",
  MANAGEMENT_REVIEW: "#22c55e",
  DATE_VOTING: "#a855f7",
  SCHEDULED: "#008993",
  DECIDED: "#10b981",
  CLOSED: "#475569",
};

function getScoreColor(score: number) {
  if (score >= 85) return "#10b981";
  if (score >= 70) return "#008993";
  if (score >= 60) return "#f97316";
  return "#ef4444";
}

export function ManagementCharts({
  chartData,
  statusCounts,
}: {
  chartData: ChartEntry[];
  statusCounts: StatusEntry[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      {/* Bar chart: rating scores */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Appraisal Scores (Decided Cycles)</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Normalised score out of 100 — last {chartData.length} decided</p>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
            No decided cycles yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#666", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#666", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d0d0d",
                  border: "1px solid #1a1a1a",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e0e0e0",
                }}
                formatter={(val) => [`${val}`, "Score"]}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={getScoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie/donut: cycle status distribution */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Cycle Status Distribution</h3>
        {statusCounts.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
            No cycles
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={statusCounts}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {statusCounts.map((entry, i) => (
                    <Cell
                      key={`pie-${i}`}
                      fill={STATUS_COLORS[entry.status] ?? "#475569"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0d0d0d",
                    border: "1px solid #1a1a1a",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "#e0e0e0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {statusCounts.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: STATUS_COLORS[s.status] ?? "#475569" }}
                    />
                    <span className="text-slate-500 truncate max-w-[140px]">{s.label}</span>
                  </div>
                  <span className="text-slate-400 font-semibold">{s.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
