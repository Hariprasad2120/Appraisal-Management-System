import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchParams = { month?: string };

function firstOfMonth(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function lastOfMonth(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month, 0);
}

export default async function PayrollGeneratePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = sp.month ?? defaultMonth;

  const orgId = session.user.activeOrganizationId ?? "default-org";
  const monthStart = firstOfMonth(selectedMonth);
  const monthEnd = lastOfMonth(selectedMonth);

  const employees = await prisma.user.findMany({
    where: { organizationId: orgId, active: true },
    include: {
      salary: true,
      employeeLopRecords: {
        where: {
          payrollMonth: { gte: monthStart, lte: monthEnd },
        },
      },
      employeeOtRecords: {
        where: { attendanceDate: { gte: monthStart, lte: monthEnd }, approvalStatus: "APPROVED" },
      },
      advances: {
        where: { status: "APPROVED", repayFromMonth: { gte: monthStart, lte: monthEnd } },
      },
    },
    orderBy: { name: "asc" },
  });

  type PayRow = {
    id: string;
    name: string;
    grossAnnum: number;
    grossMonth: number;
    lopDays: number;
    otAmount: number;
    advanceDeduction: number;
    net: number;
  };

  const rows: PayRow[] = employees.map((emp) => {
    const grossAnnum = emp.salary ? Number(emp.salary.grossAnnum) : 0;
    const grossMonth = Math.round(grossAnnum / 12);
    const lopDays = emp.employeeLopRecords.reduce((s, l) => s + Number(l.lopDays), 0);
    const lopDeduction = grossMonth > 0 ? Math.round((lopDays / 26) * grossMonth) : 0;
    const otAmount = emp.employeeOtRecords.reduce((s, r) => s + Number(r.otAmount), 0);
    const advanceDeduction = emp.advances.reduce((s, a) => s + Number(a.amount), 0);
    const net = grossMonth - lopDeduction + otAmount - advanceDeduction;
    return { id: emp.id, name: emp.name, grossAnnum, grossMonth, lopDays, otAmount, advanceDeduction, net };
  });

  const fmt = (n: number) => `â‚¹${n.toLocaleString("en-IN")}`;

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Payroll", href: "/hrms/payroll" }, { label: "Generate" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">Generate Payroll</h1>
            <p className="text-sm text-muted-foreground mt-1">Monthly payslip preview for {selectedMonth}</p>
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
            <CardTitle className="text-base">Payslip Preview â€” {rows.length} employees</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-4">Employee</th>
                  <th className="text-right py-2 px-2">Gross/Month</th>
                  <th className="text-right py-2 px-2">LOP Days</th>
                  <th className="text-right py-2 px-2">OT Earned</th>
                  <th className="text-right py-2 px-2">Advance Deduct</th>
                  <th className="text-right py-2 pl-2">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{r.name}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{fmt(r.grossMonth)}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{r.lopDays}</td>
                    <td className="text-right py-2 px-2 text-emerald-600">+{fmt(r.otAmount)}</td>
                    <td className="text-right py-2 px-2 text-destructive">-{fmt(r.advanceDeduction)}</td>
                    <td className="text-right py-2 pl-2 font-semibold">{fmt(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

