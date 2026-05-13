"use client";

import { useState, useEffect } from "react";
import { FadeIn } from "@/components/motion-div";
import { BarChart3, TrendingUp, Users, Clock, AlertCircle, IndianRupee, Trophy } from "lucide-react";
import { Loader2 } from "lucide-react";

interface DashboardData {
  summary: {
    totalCost: number;
    totalHours: number;
    totalCompOff: number;
    pendingCount: number;
  };
  leaderboard: Array<{ name: string; amount: number; hours: number }>;
  departmentCost: Array<{ name: string; cost: number }>;
}

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function OtDashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ot/dashboard?month=${month}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [month]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxDeptCost = Math.max(...data.departmentCost.map((d) => d.cost), 1);

  return (
    <div className="space-y-8 max-w-7xl">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center">
              <BarChart3 className="size-5 text-brand-cyan" />
            </div>
            <div>
              <h1 className="ds-h1">OT Analytics</h1>
              <p className="ds-body mt-0.5">High-level insights into overtime costs and trends</p>
            </div>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setLoading(true);
              setMonth(e.target.value);
            }}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
          />
        </div>
      </FadeIn>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FadeIn delay={0.1}>
          <div className="ds-card p-6 border-l-4 border-l-brand-teal">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Monthly Cost</span>
              <IndianRupee className="size-4 text-brand-teal" />
            </div>
            <div className="text-2xl font-bold text-foreground">₹{data.summary.totalCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Approved payouts for {month}</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="ds-card p-6 border-l-4 border-l-brand-cyan">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total OT Hours</span>
              <Clock className="size-4 text-brand-cyan" />
            </div>
            <div className="text-2xl font-bold text-foreground">{data.summary.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">Total extra effort logged</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="ds-card p-6 border-l-4 border-l-brand-amber">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Comp-Off Days</span>
              <Users className="size-4 text-brand-amber" />
            </div>
            <div className="text-2xl font-bold text-foreground">{data.summary.totalCompOff.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Earned leaves this month</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div className="ds-card p-6 border-l-4 border-l-red-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Approvals</span>
              <AlertCircle className="size-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{data.summary.pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review from TL/HR</p>
          </div>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Department Distribution */}
        <FadeIn delay={0.3}>
          <div className="ds-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="size-4 text-brand-cyan" />
              <h2 className="text-sm font-bold uppercase tracking-wide">Cost by Department</h2>
            </div>
            <div className="space-y-5">
              {data.departmentCost.map((dept, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{dept.name}</span>
                    <span className="text-muted-foreground font-mono">₹{dept.cost.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-cyan transition-all duration-1000" 
                      style={{ width: `${(dept.cost / maxDeptCost) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.departmentCost.length === 0 && (
                <p className="text-xs text-muted-foreground py-10 text-center italic">No cost data available for this month.</p>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Leaderboard */}
        <FadeIn delay={0.35}>
          <div className="ds-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="size-4 text-brand-amber" />
              <h2 className="text-sm font-bold uppercase tracking-wide">Top OT Earners</h2>
            </div>
            <div className="space-y-4">
              {data.leaderboard.map((user, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/5 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      #{i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{user.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">{user.hours.toFixed(1)} Hours Worked</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-brand-teal">₹{user.amount.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Payout</div>
                  </div>
                </div>
              ))}
              {data.leaderboard.length === 0 && (
                <p className="text-xs text-muted-foreground py-10 text-center italic">No earners recorded for this month.</p>
              )}
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
