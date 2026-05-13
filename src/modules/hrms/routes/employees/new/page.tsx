import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { BasicForm } from "../employee-form";
import { createEmployeeAction } from "../actions";

export default async function NewEmployeePage() {
  const managers = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true, employeeNumber: true },
    orderBy: [{ role: "desc" }, { name: "asc" }],
  });

  return (
    <div className="w-full max-w-5xl space-y-4">
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Employees", href: "/hrms/employees" }, { label: "New" }]} />
        <h1 className="text-2xl font-semibold">New Employee</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BasicForm
            action={createEmployeeAction}
            defaults={{ role: "EMPLOYEE", active: true }}
            managers={managers}
            submitLabel="Create Employee"
          />
          <p className="mt-4 text-xs text-muted-foreground">
            After creating the employee record, send a portal invite from{" "}
            <Link href="/admin/users" className="underline text-primary">User Management</Link> to grant login access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

