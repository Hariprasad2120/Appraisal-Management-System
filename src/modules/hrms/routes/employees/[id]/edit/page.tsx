import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BasicForm } from "../../employee-form";
import { updateEmployeeAction } from "../../actions";

type EditEmployeePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN") redirect("/unauthorized");

  const { id } = await params;
  const [user, managers] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: {
        organizationId: session.user.activeOrganizationId ?? "default-org",
        role: { in: ["TL", "MANAGER", "MANAGEMENT", "HR", "ADMIN"] },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, employeeNumber: true },
    }),
  ]);

  if (!user || user.organizationId !== (session.user.activeOrganizationId ?? "default-org")) {
    notFound();
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "HRMS", href: "/hrms" },
            { label: "Employees", href: "/hrms/employees" },
            { label: user.name, href: `/hrms/employees/${user.id}` },
            { label: "Edit" },
          ]}
        />
        <h1 className="text-2xl font-bold text-foreground">Edit Employee</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BasicForm
            action={updateEmployeeAction.bind(null, user.id)}
            defaults={user}
            managers={managers}
            submitLabel="Save Employee"
          />
        </CardContent>
      </Card>
    </div>
  );
}
