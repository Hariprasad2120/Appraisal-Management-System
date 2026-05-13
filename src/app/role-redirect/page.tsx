import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveAuthenticatedHomePath } from "@/lib/tenant";

export default async function RoleRedirectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  redirect(await resolveAuthenticatedHomePath(session.user));
}
