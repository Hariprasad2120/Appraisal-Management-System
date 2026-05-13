import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminArrears from "../_views/admin-arrears";
import ManagementArrears from "../_views/management-arrears";

export default async function ArrearsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, secondaryRole } = session.user;

  if (role === "ADMIN" || secondaryRole === "ADMIN") return <AdminArrears />;
  if (role === "MANAGEMENT" || secondaryRole === "MANAGEMENT") return <ManagementArrears />;
  redirect("/appraisal");
}
