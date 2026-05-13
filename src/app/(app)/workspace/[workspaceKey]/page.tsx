import { redirect } from "next/navigation";
import { getCachedSession as auth } from "@/lib/auth";
import { WorkspacePlaceholder } from "@/components/workspace-placeholder";
import {
  getVisibleWorkspaces,
  getWorkspaceDefinition,
  getWorkspaceLandingPath,
  getWorkspaceStatusLabel,
  isWorkspaceEnabled,
  roleCanAccessWorkspace,
  type WorkspaceKey,
} from "@/lib/workspace-navigation";

type WorkspacePageProps = {
  params: Promise<{ workspaceKey: WorkspaceKey }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { workspaceKey } = await params;
  const workspace = getWorkspaceDefinition(workspaceKey);
  if (!workspace) {
    redirect("/unauthorized");
  }

  if (!isWorkspaceEnabled(workspaceKey, session.user.enabledModules)) {
    redirect(`/module-disabled?module=${workspace.moduleKey}`);
  }

  if (
    !roleCanAccessWorkspace(
      workspaceKey,
      session.user.role,
      session.user.secondaryRole,
    )
  ) {
    redirect("/unauthorized");
  }

  if (workspace.availability === "live") {
    redirect(
      getWorkspaceLandingPath(
        workspace.key,
        session.user.role,
        session.user.secondaryRole,
      ),
    );
  }

  const alternateWorkspace = getVisibleWorkspaces(
    session.user.enabledModules,
    session.user.role,
    session.user.secondaryRole,
  ).find((item) => item.key !== workspace.key && item.availability === "live");

  return (
    <WorkspacePlaceholder
      eyebrow={`${workspace.label} workspace`}
      title={`${workspace.label} is ${getWorkspaceStatusLabel(workspace).toLowerCase()}`}
      description={`${workspace.description} This workspace is enabled for the current organization, but the full experience is still being rolled out. Use another live workspace in the meantime without leaving the tenant shell.`}
      primaryHref="/account/dashboard"
      primaryLabel="Back to tenant dashboard"
      secondaryHref={
        alternateWorkspace
          ? getWorkspaceLandingPath(
              alternateWorkspace.key,
              session.user.role,
              session.user.secondaryRole,
            )
          : undefined
      }
      secondaryLabel={
        alternateWorkspace ? `Open ${alternateWorkspace.label}` : undefined
      }
    />
  );
}
