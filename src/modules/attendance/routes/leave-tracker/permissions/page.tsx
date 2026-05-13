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
import { createPermissionAction, approvePermissionAction, rejectPermissionAction } from "./actions";
import { Plus } from "lucide-react";

export default async function PermissionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.activeOrganizationId ?? "default-org";

  const [requests, employees] = await Promise.all([
    prisma.permissionRequest.findMany({
      where: { organizationId: orgId },
      include: { employee: { select: { name: true, employeeNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
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
  };

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Permissions</h1>
            <p className="text-sm text-muted-foreground mt-1">Short permission slips</p>
          </div>
          <Dialog>
            <DialogTrigger>
              <Button size="sm"><Plus className="size-4 mr-1" /> New Permission</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit Permission</DialogTitle></DialogHeader>
              <form action={createPermissionAction} className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="empId">Employee</Label>
                  <select id="empId" name="employeeId" required className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" required className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="fromTime">From</Label>
                    <Input id="fromTime" name="fromTime" type="time" required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="toTime">To</Label>
                    <Input id="toTime" name="toTime" type="time" required className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="minutes">Duration (minutes)</Label>
                  <Input id="minutes" name="minutes" type="number" min={1} required className="mt-1" />
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

        <div className="space-y-3">
          {requests.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No permission requests.</CardContent></Card>
          )}
          {requests.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{r.employee.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(r.date).toLocaleDateString("en-IN")} · {r.fromTime}–{r.toTime} ({r.minutes} mins)
                  </p>
                </div>
                <Badge variant={statusVariant[r.status] ?? "secondary"}>{r.status}</Badge>
              </CardHeader>
              {r.reason && <CardContent className="text-xs text-muted-foreground pt-0">{r.reason}</CardContent>}
              {r.status === "PENDING" && (
                <CardContent className="flex gap-2 pt-0">
                  <form action={approvePermissionAction.bind(null, r.id)}>
                    <Button type="submit" size="sm">Approve</Button>
                  </form>
                  <form action={rejectPermissionAction.bind(null, r.id)}>
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
