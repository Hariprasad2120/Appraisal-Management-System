import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { createEomAction } from "./actions";
import { Star, Plus } from "lucide-react";

export default async function EmployeeOfMonthPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.activeOrganizationId ?? "default-org";

  const [winners, employees] = await Promise.all([
    prisma.employeeOfMonth.findMany({
      where: { organizationId: orgId },
      include: { employee: { select: { name: true, designation: true } } },
      orderBy: { month: "desc" },
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
            <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Tracking", href: "/hrms/tracking" }, { label: "Employee of Month" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">Employee of the Month</h1>
            <p className="text-sm text-muted-foreground mt-1">{winners.length} awards</p>
          </div>
          <Dialog>
            <DialogTrigger>
              <Button size="sm"><Plus className="size-4 mr-1" /> Award</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Award Employee of the Month</DialogTitle>
              </DialogHeader>
              <form action={createEomAction} className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Input id="month" name="month" type="month" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="employeeId">Employee</Label>
                  <select id="employeeId" name="employeeId" required className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="citation">Citation</Label>
                  <Input id="citation" name="citation" placeholder="Reason for the award" className="mt-1" />
                </div>
                <Button type="submit" className="w-full">Award</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {winners.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No awards yet.</CardContent></Card>
          )}
          {winners.map((w) => (
            <Card key={w.id} className="border-amber-400/40">
              <CardHeader className="pb-2 flex flex-row items-start gap-3">
                <Star className="size-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <CardTitle className="text-base">{w.employee.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(w.month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    {w.employee.designation ? ` Â· ${w.employee.designation}` : ""}
                  </p>
                  {w.citation && <p className="text-sm text-foreground mt-1">{w.citation}</p>}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

