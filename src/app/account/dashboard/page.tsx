import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OrganizationHubDashboard } from "@/components/organization-hub-dashboard";
import { getOrganizationHubData, normalizeOrganizationHubTab } from "@/lib/organization-hub";

type DashboardPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AccountDashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const data = await getOrganizationHubData(session.user);
  if (!data) {
    redirect("/no-organization-access");
  }

  const { tab } = await searchParams;
  const activeTab = normalizeOrganizationHubTab(tab);

  return <OrganizationHubDashboard data={data} activeTab={activeTab} />;
}
