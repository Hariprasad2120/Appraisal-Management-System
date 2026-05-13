"use server";

import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleCanAccessWorkspace } from "@/lib/workspace-navigation";
import { isWorkspaceEnabled } from "@/lib/workspace-navigation";
import { HUMAN_RESOURCE_MODULE_KEY } from "@/lib/module-catalog";

export default async function HrmsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!isWorkspaceEnabled("hrms", session.user.enabledModules)) {
    redirect(`/module-disabled?module=${HUMAN_RESOURCE_MODULE_KEY}`);
  }

  if (!roleCanAccessWorkspace("hrms", session.user.role, session.user.secondaryRole)) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
