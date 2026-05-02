import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { BasicForm } from "../employee-form";
import { createEmployeeAction } from "../actions";

export default async function NewEmployeePage() {
  const managers = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="w-full max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Employee</h1>
        <Link href="/admin/employees" className="text-sm underline">
          Back
        </Link>
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
          <p className="text-xs text-muted-foreground mt-4">
            Default login password: <code>password123</code>. Salary can be set after creation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
