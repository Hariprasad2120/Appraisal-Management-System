import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserOrganizationMemberships, resolveAuthenticatedHomePath } from "@/lib/tenant";

export default async function SelectOrganizationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const memberships = await getUserOrganizationMemberships(session.user.id);
  if (memberships.length <= 1) {
    redirect(await resolveAuthenticatedHomePath(session.user));
  }

  redirect("/account/organizations");
}
