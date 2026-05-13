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
import { createAdvanceAction, approveAdvanceAction, rejectAdvanceAction } from "./actions";
import { Plus } from "lucide-react";

export default async function AdvancesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.activeOrganizationId ?? "default-org";

  const [advances, employees] = await Promise.all([
    prisma.advance.findMany({
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

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "outline",
    APPROVED: "default",
    REJECTED: "destructive",
    REPAID: "secondary",
  };

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Salary", href: "/hrms/salary" }, { label: "Advances" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">Advances</h1>
            <p className="text-sm text-muted-foreground mt-1">{advances.length} advance records</p>
          </div>
          <Dialog>
            <DialogTrigger>
              <Button size="sm"><Plus className="size-4 mr-1" /> New Advance</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Advance</DialogTitle>
              </DialogHeader>
              <form action={createAdvanceAction} className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="employeeId">Employee</Label>
                  <select name="employeeId" id="employeeId" required className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount (â‚¹)</Label>
                  <Input id="amount" name="amount" type="number" min={1} required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Input id="reason" name="reason" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="repayFromMonth">Repay from Month</Label>
                  <Input id="repayFromMonth" name="repayFromMonth" type="month" className="mt-1" />
                </div>
                <Button type="submit" className="w-full">Submit</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {advances.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No advance records.</CardContent></Card>
          )}
          {advances.map((adv) => (
            <Card key={adv.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{adv.employee.name}</CardTitle>
                <Badge variant={statusVariant[adv.status] ?? "secondary"}>{adv.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>Amount: â‚¹{Number(adv.amount).toLocaleString("en-IN")}</p>
                {adv.reason && <p>Reason: {adv.reason}</p>}
                {adv.repayFromMonth && <p>Repay from: {new Date(adv.repayFromMonth).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>}
                {adv.status === "PENDING" && (
                  <div className="flex gap-2 mt-2">
                    <form action={approveAdvanceAction.bind(null, adv.id)}>
                      <Button type="submit" size="sm">Approve</Button>
                    </form>
                    <form action={rejectAdvanceAction.bind(null, adv.id)}>
                      <Button type="submit" size="sm" variant="destructive">Reject</Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

