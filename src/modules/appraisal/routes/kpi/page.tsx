import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminKpi from "../_views/admin-kpi";
import ReviewerKpi from "../_views/reviewer-kpi";
import ManagementKpi from "../_views/management-kpi";

const REVIEWER_ROLES = ["HR", "TL", "MANAGER", "REVIEWER"];

type KpiPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KpiPage({ searchParams }: KpiPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, secondaryRole } = session.user;

  if (role === "ADMIN" || secondaryRole === "ADMIN") return <AdminKpi searchParams={searchParams} />;
  if (role === "MANAGEMENT" || secondaryRole === "MANAGEMENT") return <ManagementKpi searchParams={searchParams} />;
  if (REVIEWER_ROLES.includes(role) || REVIEWER_ROLES.includes(secondaryRole ?? "")) {
    return <ReviewerKpi searchParams={searchParams} />;
  }
  redirect("/appraisal");
}
