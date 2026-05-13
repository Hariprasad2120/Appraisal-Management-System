import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/ui/breadcrumb";

type SearchParams = { month?: string };

export default async function PayrollOvertimePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = sp.month ?? defaultMonth;
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const records = await prisma.employeeOt.findMany({
    where: {
      employee: { organizationId: session.user.activeOrganizationId ?? "default-org" },
      attendanceDate: { gte: monthStart, lte: monthEnd },
    },
    include: { employee: { select: { id: true, name: true, employeeNumber: true } } },
    orderBy: [{ employee: { name: "asc" } }, { attendanceDate: "asc" }],
  });

  type Agg = { name: string; empNumber: number | null; totalOtHours: number; totalOtAmount: number; days: number };
  const byEmp = new Map<string, Agg>();
  for (const r of records) {
    const existing = byEmp.get(r.employeeId);
    if (existing) {
      existing.totalOtHours += Number(r.otHours);
      existing.totalOtAmount += Number(r.otAmount);
      existing.days += 1;
    } else {
      byEmp.set(r.employeeId, {
        name: r.employee.name,
        empNumber: r.employee.employeeNumber,
        totalOtHours: Number(r.otHours),
        totalOtAmount: Number(r.otAmount),
        days: 1,
      });
    }
  }
  const rows = Array.from(byEmp.entries()).map(([id, agg]) => ({ id, ...agg }));

  const fmt = (n: number) => `â‚¹${n.toLocaleString("en-IN")}`;

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Payroll", href: "/hrms/payroll" }, { label: "Overtime" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">Overtime Summary</h1>
            <p className="text-sm text-muted-foreground mt-1">Approved OT roll-up for {selectedMonth}</p>
          </div>
          <form method="get" className="flex items-end gap-2">
            <div>
              <Label htmlFor="month" className="text-xs">Select Month</Label>
              <Input id="month" name="month" type="month" defaultValue={selectedMonth} className="mt-1 w-40" />
            </div>
            <button type="submit" className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Load</button>
          </form>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">OT Summary â€” {rows.length} employees</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No approved OT records for this month.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4">Employee</th>
                    <th className="text-right py-2 px-2">OT Days</th>
                    <th className="text-right py-2 px-2">Total OT Hrs</th>
                    <th className="text-right py-2 pl-2">OT Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{r.name} {r.empNumber ? <span className="text-muted-foreground text-xs">#{r.empNumber}</span> : null}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">{r.days}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">{r.totalOtHours.toFixed(2)}</td>
                      <td className="text-right py-2 pl-2 font-semibold text-emerald-600">{fmt(r.totalOtAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

