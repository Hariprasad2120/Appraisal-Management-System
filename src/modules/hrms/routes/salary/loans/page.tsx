import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { createLoanAction, closeLoanAction } from "./actions";
import { Plus } from "lucide-react";

export default async function LoansPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.activeOrganizationId ?? "default-org";

  const [loans, employees] = await Promise.all([
    prisma.loan.findMany({
      where: { organizationId: orgId },
      include: { employee: { select: { id: true, name: true, employeeNumber: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { organizationId: orgId, active: true },
      select: { id: true, name: true, employeeNumber: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Salary", href: "/hrms/salary" }, { label: "Loans" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">Loans</h1>
            <p className="text-sm text-muted-foreground mt-1">{loans.length} loan records</p>
          </div>
          <Dialog>
            <DialogTrigger>
              <Button size="sm"><Plus className="size-4 mr-1" /> New Loan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Loan</DialogTitle>
              </DialogHeader>
              <form action={createLoanAction} className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="employeeId">Employee</Label>
                  <select name="employeeId" id="employeeId" required className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="principal">Principal (â‚¹)</Label>
                    <Input id="principal" name="principal" type="number" min={1} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="tenureMonths">Tenure (months)</Label>
                    <Input id="tenureMonths" name="tenureMonths" type="number" min={1} required className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input id="interestRate" name="interestRate" type="number" min={0} step={0.01} defaultValue="0" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="startMonth">Start Month</Label>
                    <Input id="startMonth" name="startMonth" type="month" required className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Input id="remarks" name="remarks" className="mt-1" />
                </div>
                <Button type="submit" className="w-full">Create Loan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {loans.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No loans recorded.</CardContent></Card>
          )}
          {loans.map((loan) => (
            <Card key={loan.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{loan.employee.name}</CardTitle>
                <Badge variant={loan.status === "ACTIVE" ? "default" : "secondary"}>{loan.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>Principal: â‚¹{Number(loan.principal).toLocaleString("en-IN")} Â· {loan.tenureMonths} months Â· {Number(loan.interestRate)}% p.a.</p>
                <p>Start: {new Date(loan.startMonth).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
                {loan.remarks && <p>Remarks: {loan.remarks}</p>}
                {loan.status === "ACTIVE" && (
                  <form action={closeLoanAction.bind(null, loan.id)} className="mt-2">
                    <Button type="submit" variant="outline" size="sm">Mark Closed</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

