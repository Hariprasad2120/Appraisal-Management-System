import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default async function OfferLetterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.activeOrganizationId ?? "default-org";

  const [templates, employees] = await Promise.all([
    prisma.offerLetterTemplate.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      where: { organizationId: orgId, active: true },
      select: { id: true, name: true, employeeNumber: true, designation: true, joiningDate: true, department: true, location: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div>
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Documents", href: "/hrms/documents" }, { label: "Offer Letter" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">Offer Letter</h1>
          <p className="text-sm text-muted-foreground mt-1">Select a template and employee to generate an offer letter</p>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No templates found. Create one in{" "}
              <Link href="/hrms/documents/offer-letter-format" className="underline text-primary">Offer Letter Format</Link> first.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate Offer Letter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="templateId">Template</Label>
                <select id="templateId" name="templateId" className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="employeeId">Employee</Label>
                <select id="employeeId" name="employeeId" className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="salary">Salary (for token replacement)</Label>
                <Input id="salary" name="salary" type="number" placeholder="e.g. 480000" className="mt-1" />
              </div>
              <p className="text-xs text-muted-foreground">
                Employee details (name, designation, joining date, department, location) will be auto-filled from the employee record.
                PDF generation requires server-side rendering via @react-pdf/renderer.
              </p>
              <Button type="button" disabled className="w-full">Generate PDF (coming soon)</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}

