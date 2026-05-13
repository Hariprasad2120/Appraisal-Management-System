import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolvePlatformHome } from "@/lib/platform-setup";

export default async function PlatformEntryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.platformRole !== "PLATFORM_SUPER_ADMIN") redirect("/");
  const platformState = await resolvePlatformHome(session.user);
  redirect(platformState.homePath);
}
