import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OrgWorkspaceShell } from "@/components/org-workspace-shell";
import { getOrganizationRoleLabels, setActiveOrganizationForUser } from "@/lib/tenant";

type OrgManagerPageProps = {
  params: Promise<{ orgId: string }>;
};

const MANAGER_ROLES = new Set(["ORG_OWNER", "ORG_ADMIN", "MANAGEMENT", "MANAGER"]);

export default async function OrgManagerPage({ params }: OrgManagerPageProps) {
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
  if (!roles.some((role) => MANAGER_ROLES.has(role))) {
    redirect("/unauthorized");
  }

  return (
    <OrgWorkspaceShell
      eyebrow="Organization manager"
      title="Manager workspace"
      description="Manager routes now resolve against organization membership instead of legacy role-only routing. This page is the org-safe entry point for team review work."
      organizationName={membership.organization.name}
      organizationId={membership.organization.id}
      roleLabels={getOrganizationRoleLabels(roles)}
      primaryHref="/management"
      primaryLabel="Open legacy manager dashboard"
    />
  );
}
