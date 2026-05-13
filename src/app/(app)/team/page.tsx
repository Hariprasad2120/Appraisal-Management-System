import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import { Users, UserCheck, ChevronRight } from "lucide-react";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const userId = session.user.id;

  const [myHierarchy, reporteesAsTL, reporteesAsManager, reporteesAsManagement] = await Promise.all([
    prisma.reportingHierarchy.findFirst({
      where: { organizationId, employeeId: userId, active: true },
      include: {
        teamLead: { select: { id: true, name: true, designation: true, email: true } },
        manager: { select: { id: true, name: true, designation: true, email: true } },
        management: { select: { id: true, name: true, designation: true, email: true } },
      },
    }),
    prisma.reportingHierarchy.findMany({
      where: { organizationId, teamLeadId: userId, active: true },
      include: { employee: { select: { id: true, name: true, designation: true, role: true, employeeNumber: true } } },
    }),
    prisma.reportingHierarchy.findMany({
      where: { organizationId, managerId: userId, active: true },
      include: { employee: { select: { id: true, name: true, designation: true, role: true, employeeNumber: true } } },
    }),
    prisma.reportingHierarchy.findMany({
      where: { organizationId, managementId: userId, active: true },
      include: { employee: { select: { id: true, name: true, designation: true, role: true, employeeNumber: true } } },
    }),
  ]);

  const myReportees = [
    ...reporteesAsTL.map((r) => ({ ...r.employee, relation: "Team Member" })),
    ...reporteesAsManager.map((r) => ({ ...r.employee, relation: "Under Management" })),
    ...reporteesAsManagement.map((r) => ({ ...r.employee, relation: "Under Management" })),
  ].filter((v, i, a) => a.findIndex((o) => o.id === v.id) === i);

  return (
    <FadeIn>
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <Breadcrumbs items={[{ label: "Team" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your reporting chain and direct reportees
          </p>
        </div>

        {/* Reporting chain */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="size-4 text-primary" /> My Reporting Chain
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!myHierarchy || (!myHierarchy.teamLeadId && !myHierarchy.managerId && !myHierarchy.managementId) ? (
              <p className="text-sm text-muted-foreground">No reporting hierarchy assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {myHierarchy.teamLead && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Team Lead</span>
                    <Link href={`/workspace/hrms/employees/${myHierarchy.teamLead.id}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm hover:border-primary/50 transition-colors flex-1">
                      <span className="font-medium text-foreground">{myHierarchy.teamLead.name}</span>
                      {myHierarchy.teamLead.designation && <span className="text-muted-foreground text-xs">· {myHierarchy.teamLead.designation}</span>}
                      <ChevronRight className="size-3.5 text-muted-foreground ml-auto" />
                    </Link>
                  </div>
                )}
                {myHierarchy.manager && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Manager</span>
                    <Link href={`/workspace/hrms/employees/${myHierarchy.manager.id}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm hover:border-primary/50 transition-colors flex-1">
                      <span className="font-medium text-foreground">{myHierarchy.manager.name}</span>
                      {myHierarchy.manager.designation && <span className="text-muted-foreground text-xs">· {myHierarchy.manager.designation}</span>}
                      <ChevronRight className="size-3.5 text-muted-foreground ml-auto" />
                    </Link>
                  </div>
                )}
                {myHierarchy.management && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Management</span>
                    <Link href={`/workspace/hrms/employees/${myHierarchy.management.id}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm hover:border-primary/50 transition-colors flex-1">
                      <span className="font-medium text-foreground">{myHierarchy.management.name}</span>
                      {myHierarchy.management.designation && <span className="text-muted-foreground text-xs">· {myHierarchy.management.designation}</span>}
                      <ChevronRight className="size-3.5 text-muted-foreground ml-auto" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reportees */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-primary" /> My Reportees ({myReportees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myReportees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No direct reportees assigned.</p>
            ) : (
              <div className="space-y-2">
                {myReportees.map((r) => (
                  <Link key={r.id} href={`/workspace/hrms/employees/${r.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 hover:border-primary/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.name}{r.employeeNumber ? ` #${r.employeeNumber}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{r.designation ?? r.role}{" · "}{r.relation}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
