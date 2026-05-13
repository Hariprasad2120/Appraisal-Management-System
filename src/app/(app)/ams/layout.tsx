import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { appraisalModule } from "@/modules/appraisal/module.config";
import { APPRAISAL_MODULE_KEY } from "@/lib/module-catalog";

export default async function AmsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.enabledModules?.includes(APPRAISAL_MODULE_KEY)) {
    redirect(`/module-disabled?module=${APPRAISAL_MODULE_KEY}`);
  }

  if (!appraisalModule.canAccess(session.user.role, session.user.secondaryRole)) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
