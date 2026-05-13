import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OrgWorkspaceShell } from "@/components/org-workspace-shell";
import { getOrganizationRoleLabels, setActiveOrganizationForUser } from "@/lib/tenant";

type OrgReviewerPageProps = {
  params: Promise<{ orgId: string }>;
};

const REVIEWER_ROLES = new Set(["ORG_OWNER", "ORG_ADMIN", "APPRAISAL_ADMIN", "HR", "MANAGER", "TEAM_LEAD"]);

export default async function OrgReviewerPage({ params }: OrgReviewerPageProps) {
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
  if (!roles.some((role) => REVIEWER_ROLES.has(role))) {
    redirect("/unauthorized");
  }

  return (
    <OrgWorkspaceShell
      eyebrow="Organization reviewer"
      title="Reviewer workspace"
      description="Reviewer and TL access now depends on active organization membership plus assigned organization roles. This shell keeps the route tenant-safe while legacy reviewer screens are still in use."
      organizationName={membership.organization.name}
      organizationId={membership.organization.id}
      roleLabels={getOrganizationRoleLabels(roles)}
      primaryHref="/reviewer"
      primaryLabel="Open legacy reviewer dashboard"
    />
  );
}
