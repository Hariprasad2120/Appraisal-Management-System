import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminMomDetail from "../../_views/admin-mom-detail";
import ReviewerMomDetail from "../../_views/reviewer-mom-detail";
import ManagementMomDetail from "../../_views/management-mom-detail";

type Props = { params: Promise<{ cycleId: string }> };

export default async function MomDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, secondaryRole } = session.user;

  if (role === "ADMIN" || secondaryRole === "ADMIN") return <AdminMomDetail params={params} />;
  if (role === "HR" || secondaryRole === "HR") return <ReviewerMomDetail params={params} />;
  if (role === "MANAGEMENT" || secondaryRole === "MANAGEMENT") return <ManagementMomDetail params={params} />;
  redirect("/appraisal/mom");
}
