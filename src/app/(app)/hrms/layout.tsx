import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hrmsModule } from "@/modules/hrms/module.config";
import { HUMAN_RESOURCE_MODULE_KEY } from "@/lib/module-catalog";

export default async function HrmsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.enabledModules?.includes(HUMAN_RESOURCE_MODULE_KEY)) {
    redirect(`/module-disabled?module=${HUMAN_RESOURCE_MODULE_KEY}`);
  }

  if (!hrmsModule.canAccess(session.user.role, session.user.secondaryRole)) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
