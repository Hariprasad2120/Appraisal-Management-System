import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import {
  inviteUserAction,
  resendInviteAction,
  cancelInviteAction,
  revokeAccessAction,
  reactivateUserAction,
  deleteUserAccountAction,
} from "./actions";
import { getAccountUsage } from "@/lib/tenant";
import { UserCheck, Clock, UserX, Plus, Trash2, RefreshCw, Send, Ban } from "lucide-react";

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN") redirect("/");

  const { employee: preselectedEmployee } = await searchParams;
  const orgId = session.user.activeOrganizationId ?? "default-org";

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { accountId: true, name: true },
  });

  const [activeUsers, revokedUsers, pendingInvites, invitableEmployees] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: orgId, active: true, status: "ACTIVE" },
      select: { id: true, name: true, email: true, role: true, designation: true, employeeNumber: true, status: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { active: false },
          { status: { in: ["INVITED", "SUSPENDED"] } },
        ],
      },
      select: { id: true, name: true, email: true, role: true, designation: true, employeeNumber: true, status: true },
      orderBy: { name: "asc" },
    }),
    prisma.invite.findMany({
      where: { organizationId: orgId, status: "PENDING", expiresAt: { gt: new Date() } },
      include: { invitedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        organizationId: orgId,
        email: { not: "" },
        OR: [
          { active: false },
          { status: { in: ["INVITED", "SUSPENDED"] } },
        ],
      },
      select: { id: true, name: true, email: true, employeeNumber: true, designation: true },
      orderBy: { name: "asc" },
    }),
  ]);

  let seatInfo: { used: number; max: number | null; planName: string | null } = { used: activeUsers.length, max: null, planName: null };
  if (org?.accountId) {
    const usage = await getAccountUsage(org.accountId);
    seatInfo = {
      used: usage.activeEmployeeCount,
      max: usage.subscription?.plan?.maxEmployees ?? null,
      planName: usage.subscription?.plan?.name ?? null,
    };
  }

  const roleLabel: Record<string, string> = {
    ADMIN: "Admin", MANAGEMENT: "Management", HR: "HR",
    MANAGER: "Manager", TL: "Team Lead", EMPLOYEE: "Employee",
    PARTNER: "Partner", REVIEWER: "Reviewer",
  };

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "User Management" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {seatInfo.used} active
              {seatInfo.max !== null ? ` / ${seatInfo.max} seats` : " users"}
              {seatInfo.planName ? ` · ${seatInfo.planName} plan` : ""}
            </p>
          </div>

          {invitableEmployees.length > 0 && (
            <Dialog>
              <DialogTrigger>
                <Button size="sm"><Plus className="size-4 mr-1" /> Invite User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Employee to Portal</DialogTitle>
                </DialogHeader>
                <form action={inviteUserAction} className="space-y-4 mt-2">
                  <div>
                    <Label htmlFor="userId">Employee</Label>
                    <select
                      id="userId"
                      name="userId"
                      required
                      className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background"
                      defaultValue={preselectedEmployee ?? ""}
                    >
                      <option value="" disabled>Select employee…</option>
                      {invitableEmployees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                          {e.employeeNumber ? ` (#${e.employeeNumber})` : ""}
                          {e.designation ? ` · ${e.designation}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    An email with an activation link will be sent to the employee&apos;s registered email. The link expires in 7 days.
                  </p>
                  <Button type="submit" className="w-full">Send Invite</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Active Users */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserCheck className="size-4 text-green-600" /> Active Users ({activeUsers.length})
          </div>
          {activeUsers.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No active users yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {activeUsers.map((u) => (
                <Card key={u.id} className="border-green-200/60">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{u.name}{u.employeeNumber ? ` #${u.employeeNumber}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{u.email} · {roleLabel[u.role] ?? u.role}{u.designation ? ` · ${u.designation}` : ""}</p>
                    </div>
                    {u.id !== session.user.id && (
                      <form action={revokeAccessAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button type="submit" variant="outline" size="sm" className="text-orange-600 border-orange-300 hover:bg-orange-50">
                          <Ban className="size-3.5 mr-1.5" /> Revoke
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Pending Invites */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="size-4 text-amber-500" /> Pending Invites ({pendingInvites.length})
          </div>
          {pendingInvites.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No pending invites.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <Card key={inv.id} className="border-amber-200/60">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{inv.name ?? inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.email} · expires {new Date(inv.expiresAt).toLocaleDateString("en-IN")}
                        {inv.invitedBy ? ` · invited by ${inv.invitedBy.name}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <form action={resendInviteAction}>
                        <input type="hidden" name="inviteId" value={inv.id} />
                        <Button type="submit" variant="outline" size="sm">
                          <Send className="size-3.5 mr-1.5" /> Resend
                        </Button>
                      </form>
                      <form action={cancelInviteAction}>
                        <input type="hidden" name="inviteId" value={inv.id} />
                        <Button type="submit" variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                          Cancel
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Revoked / Inactive */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserX className="size-4 text-red-500" /> No Portal Access ({revokedUsers.length})
          </div>
          {revokedUsers.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">All employees have portal access.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {revokedUsers.map((u) => (
                <Card key={u.id} className="border-muted">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{u.name}{u.employeeNumber ? ` #${u.employeeNumber}` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.email} · {roleLabel[u.role] ?? u.role}
                        {u.designation ? ` · ${u.designation}` : ""}
                        <span className="ml-1 capitalize text-muted-foreground/70">({u.status.toLowerCase()})</span>
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <form action={reactivateUserAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button type="submit" variant="outline" size="sm" className="text-green-600 border-green-300 hover:bg-green-50">
                          <RefreshCw className="size-3.5 mr-1.5" /> Re-invite
                        </Button>
                      </form>
                      <form action={deleteUserAccountAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5 mr-1.5" /> Delete
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </FadeIn>
  );
}
