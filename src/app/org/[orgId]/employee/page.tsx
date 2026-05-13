import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OrgWorkspaceShell } from "@/components/org-workspace-shell";
import { getOrganizationRoleLabels, setActiveOrganizationForUser } from "@/lib/tenant";

type OrgEmployeePageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function OrgEmployeePage({ params }: OrgEmployeePageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { orgId } = await params;
  const membership = await setActiveOrganizationForUser(session.user.id, orgId);
  if (!membership) {
    redirect("/no-organization-access");
  }

  const roles = membership.roleAssignments.map((assignment) => assignment.role);

  return (
    <OrgWorkspaceShell
      eyebrow="Organization employee"
      title="Employee workspace"
      description="Employees now enter the appraisal platform through an organization-scoped route that proves membership before handing off to the existing employee experience."
      organizationName={membership.organization.name}
      organizationId={membership.organization.id}
      roleLabels={getOrganizationRoleLabels(roles)}
      primaryHref="/employee"
      primaryLabel="Open legacy employee dashboard"
    />
  );
}
