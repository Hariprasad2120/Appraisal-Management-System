"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toTitleCase } from "@/lib/utils";
import { TrendingUp, TrendingDown, IndianRupee } from "lucide-react";

type Employee = {
  id: string;
  userId: string;
  name: string;
  department: string;
  avgRating: number;
  hikePercent: number;
  slabLabel: string;
  grossAnnum: number;
  decided: boolean;
  finalAmount: number | null;
};

type Slab = {
  id: string;
  label: string;
  minRating: number;
  maxRating: number;
  hikePercent: number;
};

export function SalaryCalculator({ employees, slabs }: { employees: Employee[]; slabs: Slab[] }) {
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  function getHike(emp: Employee): number {
    if (overrides[emp.id] !== undefined) return overrides[emp.id];
    return emp.hikePercent;
  }

  function getSlab(hikePercent: number): Slab | undefined {
    return slabs.find((s) => s.hikePercent === hikePercent);
  }

  const totals = employees.reduce(
    (acc, emp) => {
      const hike = getHike(emp);
      acc.totalCurrentCost += emp.grossAnnum;
      acc.totalIncrementCost += Math.round((emp.grossAnnum * hike) / 100);
      return acc;
    },
    { totalCurrentCost: 0, totalIncrementCost: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="text-xs text-slate-500 mb-1">Total Current Cost (Gross)</div>
            <div className="ds-h1">
              ₹{(totals.totalCurrentCost / 100000).toFixed(1)}L
            </div>
            <div className="text-xs text-slate-400">per annum</div>
          </CardContent>
        </Card>
        <motion.div
          key={`increment-${totals.totalIncrementCost}`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-0 shadow-sm border-l-4 border-l-green-400">
            <CardContent className="p-5">
              <div className="text-xs text-slate-500 mb-1">Total Increment Cost</div>
              <div className="text-2xl font-bold text-green-600">
                +₹{(totals.totalIncrementCost / 100000).toFixed(1)}L
              </div>
              <div className="text-xs text-slate-400">per annum</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          key={`total-${totals.totalCurrentCost + totals.totalIncrementCost}`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-0 shadow-sm border-l-4 border-l-blue-400">
            <CardContent className="p-5">
              <div className="text-xs text-slate-500 mb-1">New Total Cost</div>
              <div className="text-2xl font-bold text-blue-600">
                ₹{((totals.totalCurrentCost + totals.totalIncrementCost) / 100000).toFixed(1)}L
              </div>
              <div className="text-xs text-slate-400">per annum</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Employee Increment Details</CardTitle>
          <p className="text-xs text-slate-500">Adjust hike % to see live salary impact</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border bg-muted/40">
                  <th className="py-2.5 px-4 ds-label">Employee</th>
                  <th className="px-4 ds-label">Avg Rating</th>
                  <th className="px-4 ds-label">Slab</th>
                  <th className="px-4 ds-label">Hike %</th>
                  <th className="px-4 ds-label">Current Gross</th>
                  <th className="px-4 ds-label">Increment</th>
                  <th className="px-4 ds-label">New Gross</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground/50">
                      No employees ready for salary review
                    </td>
                  </tr>
                )}
                {employees.map((emp) => {
                  const hike = getHike(emp);
                  const increment = Math.round((emp.grossAnnum * hike) / 100);
                  const newGross = emp.grossAnnum + increment;
                  const currentSlab = getSlab(hike);

                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">{toTitleCase(emp.name)}</div>
                        <div className="text-xs text-slate-400">{emp.department}</div>
                      </td>
                      <td className="px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {emp.avgRating.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4">
                        <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full px-2 py-0.5">
                          {currentSlab?.label ?? emp.slabLabel}
                        </span>
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={hike}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) setOverrides((prev) => ({ ...prev, [emp.id]: val }));
                            }}
                            className="w-16 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                          />
                          <span className="text-xs text-slate-500">%</span>
                          {overrides[emp.id] !== undefined && (
                            <button
                              onClick={() => setOverrides((prev) => { const n = { ...prev }; delete n[emp.id]; return n; })}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              ↺
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 text-slate-600 dark:text-slate-400">
                        ₹{emp.grossAnnum.toLocaleString()}
                      </td>
                      <td className="px-4">
                        <motion.div
                          key={increment}
                          initial={{ opacity: 0.5, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-1 text-green-600 font-medium"
                        >
                          <TrendingUp className="size-3" />
                          +₹{increment.toLocaleString()}
                        </motion.div>
                      </td>
                      <td className="px-4">
                        <motion.div
                          key={newGross}
                          initial={{ opacity: 0.5 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="font-semibold text-slate-900 dark:text-white"
                        >
                          ₹{newGross.toLocaleString()}
                        </motion.div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
