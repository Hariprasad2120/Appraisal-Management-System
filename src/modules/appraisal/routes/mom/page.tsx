import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminMom from "../_views/admin-mom";
import ReviewerMom from "../_views/reviewer-mom";
import ManagementMom from "../_views/management-mom";

export default async function MomPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, secondaryRole } = session.user;

  if (role === "ADMIN" || secondaryRole === "ADMIN") return <AdminMom />;
  if (role === "HR" || secondaryRole === "HR") return <ReviewerMom />;
  if (role === "MANAGEMENT" || secondaryRole === "MANAGEMENT") return <ManagementMom />;
  redirect("/appraisal");
}
