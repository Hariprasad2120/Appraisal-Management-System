import { notFound, redirect } from "next/navigation";
import { FadeIn } from "@/components/motion-div";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PolicyForm } from "../../policy-form";
import { updatePolicyAction } from "../../actions";

type EditPolicyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPolicyPage({ params }: EditPolicyPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "HR"].includes(session.user.role)) redirect("/unauthorized");

  const { id } = await params;
  const policy = await prisma.policy.findUnique({ where: { id } });

  if (!policy || policy.organizationId !== (session.user.activeOrganizationId ?? "default-org")) {
    notFound();
  }

  return (
    <FadeIn>
      <div className="max-w-2xl space-y-6 p-6">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: "HRMS", href: "/hrms" },
              { label: "Policies", href: "/hrms/policies" },
              { label: policy.title, href: `/hrms/policies/${policy.id}` },
              { label: "Edit" },
            ]}
          />
          <h1 className="text-2xl font-bold text-foreground">Edit Policy</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Policy Details</CardTitle>
          </CardHeader>
          <CardContent>
            <PolicyForm
              action={updatePolicyAction.bind(null, policy.id)}
              defaults={policy}
              submitLabel="Save Changes"
            />
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
