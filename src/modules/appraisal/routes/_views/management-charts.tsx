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
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Appraisal Scores (Decided Cycles)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Normalised score out of 100 - last {chartData.length} decided</p>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No decided cycles yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
                formatter={(val) => [`${val}`, "Score"]}
                cursor={{ fill: "rgba(14,138,149,0.06)" }}
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
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Cycle Status Distribution</h3>
        {statusCounts.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
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
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "var(--foreground)",
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
                    <span className="text-muted-foreground truncate max-w-[140px]">{s.label}</span>
                  </div>
                  <span className="text-foreground font-semibold">{s.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
