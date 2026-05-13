import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumb";

const ONBOARDING_CHECKLIST = [
  "Offer letter issued",
  "ID proof collected",
  "Bank details submitted",
  "PAN & Aadhaar verified",
  "System access created",
  "Induction session completed",
  "Policies acknowledged",
  "Emergency contact recorded",
];

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.activeOrganizationId ?? "default-org";

  const recentEmployees = await prisma.user.findMany({
    where: { organizationId: orgId, active: true },
    select: {
      id: true, name: true, employeeNumber: true, joiningDate: true, designation: true,
      employeeDocuments: { select: { id: true, type: true, issuedAt: true } },
    },
    orderBy: { joiningDate: "desc" },
    take: 20,
  });

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div>
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Documents", href: "/hrms/documents" }, { label: "Onboarding" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">Employee onboarding checklist and documentation status</p>
        </div>

        <div className="space-y-3">
          {recentEmployees.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No employees found.</CardContent></Card>
          )}
          {recentEmployees.map((emp) => {
            const docTypes = new Set(emp.employeeDocuments.map((d) => d.type));
            return (
              <Card key={emp.id}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{emp.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {emp.designation ?? "â€”"} Â· Joined {new Date(emp.joiningDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <Badge variant={docTypes.size >= 2 ? "default" : "secondary"}>
                    {docTypes.size} docs
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ONBOARDING_CHECKLIST.map((item) => {
                      const done = item === "Offer letter issued"
                        ? docTypes.has("OFFER_LETTER")
                        : item === "ID proof collected"
                        ? docTypes.has("ID_PROOF")
                        : item === "Induction session completed"
                        ? docTypes.has("ONBOARDING")
                        : false;
                      return (
                        <span
                          key={item}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            done ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-muted text-muted-foreground"
                          }`}
                        >
                          {done ? "âœ“" : "â—‹"} {item}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}

