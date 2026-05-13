import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.platformRole !== "PLATFORM_SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  return children;
}
