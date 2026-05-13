import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OrgWorkspaceShell } from "@/components/org-workspace-shell";
import { getOrganizationRoleLabels, setActiveOrganizationForUser } from "@/lib/tenant";

type OrgHrPageProps = {
  params: Promise<{ orgId: string }>;
};

const HR_ROLES = new Set(["ORG_OWNER", "ORG_ADMIN", "APPRAISAL_ADMIN", "HR"]);

export default async function OrgHrPage({ params }: OrgHrPageProps) {
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
  if (!roles.some((role) => HR_ROLES.has(role))) {
    redirect("/unauthorized");
  }

  return (
    <OrgWorkspaceShell
      eyebrow="Organization HR"
      title="HR workspace"
      description="HR access is now anchored to an active organization membership. This page becomes the tenant-safe doorway into the current HR and coordination workflows."
      organizationName={membership.organization.name}
      organizationId={membership.organization.id}
      roleLabels={getOrganizationRoleLabels(roles)}
      primaryHref="/management"
      primaryLabel="Open legacy HR dashboard"
    />
  );
}
