import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

export default async function OtLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole)) redirect("/");
  return <>{children}</>;
}
