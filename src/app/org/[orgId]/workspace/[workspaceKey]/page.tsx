import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirectToOrganizationWorkspace } from "@/lib/org-entry";
import { getWorkspaceDefinition, type WorkspaceKey } from "@/lib/workspace-navigation";

type OrgWorkspaceEntryPageProps = {
  params: Promise<{ orgId: string; workspaceKey: WorkspaceKey }>;
};

export default async function OrgWorkspaceEntryPage({
  params,
}: OrgWorkspaceEntryPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { orgId, workspaceKey } = await params;
  if (!getWorkspaceDefinition(workspaceKey)) {
    redirect("/unauthorized");
  }

  await redirectToOrganizationWorkspace(session.user, orgId, workspaceKey);
}
