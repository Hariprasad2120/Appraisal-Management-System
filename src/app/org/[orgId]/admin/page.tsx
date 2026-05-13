import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OrgWorkspaceShell } from "@/components/org-workspace-shell";
import { getOrganizationRoleLabels, setActiveOrganizationForUser } from "@/lib/tenant";

type OrgAdminPageProps = {
  params: Promise<{ orgId: string }>;
};

const ADMIN_ROLES = new Set(["ORG_OWNER", "ORG_ADMIN", "APPRAISAL_ADMIN"]);

export default async function OrgAdminPage({ params }: OrgAdminPageProps) {
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
  if (!roles.some((role) => ADMIN_ROLES.has(role))) {
    redirect("/unauthorized");
  }

  return (
    <OrgWorkspaceShell
      eyebrow="Organization admin"
      title="Organization admin workspace"
      description="This org-scoped entry now hands off to the shared organization hub, where admins can review structure, switch modules, and launch the live workspaces for the current tenant."
      organizationName={membership.organization.name}
      organizationId={membership.organization.id}
      roleLabels={getOrganizationRoleLabels(roles)}
      primaryHref="/account/dashboard"
      primaryLabel="Open organization hub"
    />
  );
}
