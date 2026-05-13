import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirectToOrganizationHome } from "@/lib/org-entry";

type OrgEntryPageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function OrganizationEntryPage({ params }: OrgEntryPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { orgId } = await params;
  await redirectToOrganizationHome(session.user, orgId);
}
