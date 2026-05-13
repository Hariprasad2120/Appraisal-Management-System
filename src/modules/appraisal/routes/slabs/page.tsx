import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSlabs from "../_views/admin-slabs";
import ManagementSlabs from "../_views/management-slabs";

export default async function SlabsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, secondaryRole } = session.user;

  if (role === "ADMIN" || secondaryRole === "ADMIN") return <AdminSlabs />;
  if (role === "MANAGEMENT" || secondaryRole === "MANAGEMENT") return <ManagementSlabs />;
  redirect("/appraisal");
}
