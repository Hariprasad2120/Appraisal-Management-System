import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { createLeaveRequestAction, approveLeaveAction, rejectLeaveAction, createLeaveTypeAction } from "./actions";
import { Plus, Settings } from "lucide-react";

export default async function LeavesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.activeOrganizationId ?? "default-org";

  const [requests, leaveTypes, employees] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { organizationId: orgId },
      include: {
        employee: { select: { name: true, employeeNumber: true } },
        leaveType: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.leaveType.findMany({ where: { organizationId: orgId, active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { organizationId: orgId, active: true }, select: { id: true, name: true, employeeNumber: true }, orderBy: { name: "asc" } }),
  ]);

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "outline",
    APPROVED: "default",
    REJECTED: "destructive",
    CANCELLED: "secondary",
  };

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leaves</h1>
            <p className="text-sm text-muted-foreground mt-1">{requests.length} recent requests</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger>
                <Button size="sm" variant="outline"><Settings className="size-4 mr-1" /> Leave Types</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Leave Type</DialogTitle></DialogHeader>
                <form action={createLeaveTypeAction} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="code">Code</Label>
                      <Input id="code" name="code" placeholder="CL" required className="mt-1 uppercase" />
                    </div>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" placeholder="Casual Leave" required className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="defaultQuota">Annual Quota (days)</Label>
                    <Input id="defaultQuota" name="defaultQuota" type="number" min={0} defaultValue={0} className="mt-1" />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" name="paid" defaultChecked className="accent-primary" />
                    Paid leave
                  </label>
                  <Button type="submit" className="w-full">Add Leave Type</Button>
                </form>
                <div className="mt-4 space-y-1">
                  {leaveTypes.map((lt) => (
                    <div key={lt.id} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs bg-muted rounded px-1.5">{lt.code}</span>
                      <span>{lt.name}</span>
                      <span className="text-muted-foreground">{Number(lt.defaultQuota)}d · {lt.paid ? "Paid" : "Unpaid"}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger>
                <Button size="sm"><Plus className="size-4 mr-1" /> New Request</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle></DialogHeader>
                <form action={createLeaveRequestAction} className="space-y-4 mt-2">
                  <div>
                    <Label htmlFor="empId">Employee</Label>
                    <select id="empId" name="employeeId" required className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="ltId">Leave Type</Label>
                    <select id="ltId" name="leaveTypeId" required className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                      {leaveTypes.map((lt) => (
                        <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="fromDate">From</Label>
                      <Input id="fromDate" name="fromDate" type="date" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="toDate">To</Label>
                      <Input id="toDate" name="toDate" type="date" required className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="days">Days</Label>
                    <Input id="days" name="days" type="number" min={0.5} step={0.5} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Input id="reason" name="reason" className="mt-1" />
                  </div>
                  <Button type="submit" className="w-full">Submit</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-3">
          {requests.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No leave requests.</CardContent></Card>
          )}
          {requests.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{r.employee.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.leaveType.name} · {r.days.toString()}d · {new Date(r.fromDate).toLocaleDateString("en-IN")} – {new Date(r.toDate).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <Badge variant={statusVariant[r.status] ?? "secondary"}>{r.status}</Badge>
              </CardHeader>
              {r.reason && <CardContent className="text-xs text-muted-foreground pt-0">{r.reason}</CardContent>}
              {r.status === "PENDING" && (
                <CardContent className="flex gap-2 pt-0">
                  <form action={approveLeaveAction.bind(null, r.id)}>
                    <Button type="submit" size="sm">Approve</Button>
                  </form>
                  <form action={rejectLeaveAction.bind(null, r.id)}>
                    <Button type="submit" size="sm" variant="destructive">Reject</Button>
                  </form>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}
