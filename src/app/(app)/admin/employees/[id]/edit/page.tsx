import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasicForm, SalaryForm } from "../../employee-form";
import { updateEmployeeAction, upsertSalaryAction } from "../../actions";
import { toTitleCase } from "@/lib/utils";

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { salary: true },
  });
  if (!user) notFound();

  const managers = await prisma.user.findMany({
    where: { active: true, id: { not: id } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const updateBasic = updateEmployeeAction.bind(null, id);
  const updateSalary = upsertSalaryAction.bind(null, id);

  return (
    <div className="w-full max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit: {toTitleCase(user.name)}</h1>
        <Link href={`/admin/employees/${id}`} className="text-sm underline">
          Cancel
        </Link>
      </div>

      <Tabs defaultValue={tab === "salary" ? "salary" : "basic"} className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="salary">Salary Details</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
            </CardHeader>
            <CardContent>
              <BasicForm
                action={updateBasic}
                defaults={user}
                managers={managers}
                submitLabel="Save Basic Details"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Salary Details</CardTitle>
            </CardHeader>
            <CardContent>
              <SalaryForm
                action={updateSalary}
                defaults={{
                  grossAnnum: user.salary ? Number(user.salary.grossAnnum) : 0,
                  ctcAnnum: user.salary ? Number(user.salary.ctcAnnum) : 0,
                  basic: user.salary ? Number(user.salary.basic) : 0,
                  hra: user.salary ? Number(user.salary.hra) : 0,
                  conveyance: user.salary ? Number(user.salary.conveyance) : 0,
                  transport: user.salary ? Number(user.salary.transport) : 0,
                  travelling: user.salary ? Number(user.salary.travelling) : 0,
                  fixedAllowance: user.salary ? Number(user.salary.fixedAllowance) : 0,
                  stipend: user.salary ? Number(user.salary.stipend) : 0,
                }}
                submitLabel={user.salary ? "Save Salary" : "Create Salary"}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
