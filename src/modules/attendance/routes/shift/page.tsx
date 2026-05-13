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
import { createShiftAction, assignShiftAction } from "./actions";
import { Plus, Users } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function ShiftPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.activeOrganizationId ?? "default-org";

  const [shifts, employees] = await Promise.all([
    prisma.shift.findMany({
      where: { organizationId: orgId, active: true },
      include: {
        assignments: {
          where: { effectiveTo: null },
          include: { employee: { select: { name: true, employeeNumber: true } } },
        },
      },
      orderBy: { name: "asc" },
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Shift Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">{shifts.length} shift definitions</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger>
                <Button size="sm" variant="outline"><Plus className="size-4 mr-1" /> New Shift</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Shift</DialogTitle></DialogHeader>
                <form action={createShiftAction} className="space-y-4 mt-2">
                  <div>
                    <Label htmlFor="name">Shift Name</Label>
                    <Input id="name" name="name" placeholder="e.g. Day Shift" required className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input id="startTime" name="startTime" type="time" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input id="endTime" name="endTime" type="time" required className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Weekly Off (select days)</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {DAYS.map((d, i) => (
                        <label key={d} className="flex items-center gap-1 text-sm cursor-pointer">
                          <input type="checkbox" name={`weeklyOff_${i}`} value={i} className="accent-primary" />
                          {d.slice(0, 3)}
                        </label>
                      ))}
                    </div>
                    <input type="hidden" name="weeklyOff" value="[]" />
                  </div>
                  <Button type="submit" className="w-full">Create Shift</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger>
                <Button size="sm"><Users className="size-4 mr-1" /> Assign</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign Shift to Employee</DialogTitle></DialogHeader>
                <form action={assignShiftAction} className="space-y-4 mt-2">
                  <div>
                    <Label htmlFor="assignEmployeeId">Employee</Label>
                    <select id="assignEmployeeId" name="employeeId" required className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="assignShiftId">Shift</Label>
                    <select id="assignShiftId" name="shiftId" required className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="effectiveFrom">Effective From</Label>
                    <Input id="effectiveFrom" name="effectiveFrom" type="date" required className="mt-1" />
                  </div>
                  <Button type="submit" className="w-full">Assign</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-3">
          {shifts.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No shifts defined.</CardContent></Card>
          )}
          {shifts.map((shift) => (
            <Card key={shift.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{shift.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{shift.startTime} – {shift.endTime}</p>
              </CardHeader>
              <CardContent>
                {shift.assignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No employees assigned.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {shift.assignments.map((a) => (
                      <span key={a.id} className="text-xs bg-muted rounded px-2 py-1">
                        {a.employee.name}
                      </span>
                    ))}
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
