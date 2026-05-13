import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getHrmsEmployeeAssignPath,
  getHrmsEmployeeEditPath,
  getHrmsEmployeesPath,
} from "@/modules/hrms/lib/routes";

type EmployeeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      salary: true,
      reportingManager: { select: { id: true, name: true, role: true } },
      cyclesAsEmployee: {
        where: { organizationId: session.user.activeOrganizationId ?? "default-org" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, type: true, createdAt: true },
      },
    },
  });

  if (!user || user.organizationId !== (session.user.activeOrganizationId ?? "default-org")) {
    notFound();
  }

  const latestCycle = user.cyclesAsEmployee[0] ?? null;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: "HRMS", href: "/hrms" },
              { label: "Employees", href: "/hrms/employees" },
              { label: user.name },
            ]}
          />
          <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {user.employeeNumber ? `#${user.employeeNumber} · ` : ""}
            {user.role}
            {user.department ? ` · ${user.department}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={getHrmsEmployeeEditPath(user.id)}>
            <Button variant="outline">Edit Profile</Button>
          </Link>
          <Link href={getHrmsEmployeeAssignPath(user.id)}>
            <Button>Assign Appraisal</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Employee Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div><span className="text-muted-foreground">Email:</span> {user.email}</div>
            <div><span className="text-muted-foreground">Location:</span> {user.location ?? "—"}</div>
            <div><span className="text-muted-foreground">Joining Date:</span> {user.joiningDate.toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Designation:</span> {user.designation ?? "—"}</div>
            <div><span className="text-muted-foreground">Reporting Manager:</span> {user.reportingManager?.name ?? "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> {user.active ? "Active" : "Inactive"}</div>
            <div><span className="text-muted-foreground">Work Phone:</span> {user.workPhone ?? "—"}</div>
            <div><span className="text-muted-foreground">Personal Phone:</span> {user.personalPhone ?? "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">Gross Annual</div>
              <div className="font-medium">
                {user.salary ? `₹${Number(user.salary.grossAnnum).toLocaleString("en-IN")}` : "Not set"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Latest Appraisal</div>
              <div className="font-medium">
                {latestCycle ? `${latestCycle.type} · ${latestCycle.status.replace(/_/g, " ")}` : "No cycle yet"}
              </div>
            </div>
            <div>
              <Link href={getHrmsEmployeesPath()}>
                <Button variant="outline" className="w-full">Back To Employee List</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
