import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboard from "./_views/admin-dashboard";
import ReviewerDashboard from "./_views/reviewer-dashboard";
import ManagementDashboard from "./_views/management-dashboard";
import EmployeeDashboard from "./_views/employee-dashboard";
import PartnerDashboard from "./_views/partner-dashboard";

const REVIEWER_ROLES = ["HR", "TL", "MANAGER", "REVIEWER"];

export default async function AppraisalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role } = session.user;

  if (role === "ADMIN") return <AdminDashboard />;
  if (role === "MANAGEMENT") return <ManagementDashboard />;
  if (REVIEWER_ROLES.includes(role)) return <ReviewerDashboard />;
  if (role === "PARTNER") return <PartnerDashboard />;
  return <EmployeeDashboard />;
}
