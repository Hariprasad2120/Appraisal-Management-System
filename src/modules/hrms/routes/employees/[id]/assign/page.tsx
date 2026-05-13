import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppraisalEligibility } from "@/lib/appraisal-eligibility";
import { AssignForm } from "@/app/(app)/workspace/hrms/employees/[id]/assign/assign-form";

type AssignEmployeePageProps = {
  params: Promise<{ id: string }>;
};

export default async function AssignEmployeePage({ params }: AssignEmployeePageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN") redirect("/unauthorized");

  const { id } = await params;
  const organizationId = session.user.activeOrganizationId ?? "default-org";

  const [employee, hrUsers, tlUsers, mgrUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        cyclesAsEmployee: {
          where: { organizationId, status: { notIn: ["CLOSED", "DECIDED"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            assignments: {
              select: { role: true, reviewerId: true, availability: true },
              orderBy: { role: "asc" },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { organizationId, active: true, role: "HR" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { organizationId, active: true, role: "TL" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { organizationId, active: true, role: { in: ["MANAGER", "MANAGEMENT"] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!employee || employee.organizationId !== organizationId) {
    notFound();
  }

  const activeCycle = employee.cyclesAsEmployee[0] ?? null;
  const eligibility = getAppraisalEligibility(employee.joiningDate);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "HRMS", href: "/hrms" },
            { label: "Employees", href: "/hrms/employees" },
            { label: employee.name, href: `/hrms/employees/${employee.id}` },
            { label: "Assign Appraisal" },
          ]}
        />
        <h1 className="text-2xl font-bold text-foreground">Assign Appraisal</h1>
        <p className="text-sm text-muted-foreground">
          Set HR, TL, and manager reviewers for {employee.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviewer Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignForm
            employeeId={employee.id}
            employeeName={employee.name}
            existingCycleId={activeCycle?.id ?? null}
            existingCycleType={activeCycle?.type ?? null}
            existingCycleIsManagerCycle={activeCycle?.isManagerCycle ?? false}
            existingAssignments={activeCycle?.assignments.map((assignment) => ({
              role: assignment.role,
              reviewerId: assignment.reviewerId,
            })) ?? []}
            autoType={eligibility.eligible ? eligibility.cycleType : "ANNUAL"}
            autoReason={eligibility.reason}
            eligible={eligibility.eligible}
            hrUsers={hrUsers}
            tlUsers={tlUsers}
            mgrUsers={mgrUsers}
            appraiseeId={employee.id}
            employeeRole={employee.role}
          />
        </CardContent>
      </Card>
    </div>
  );
}
