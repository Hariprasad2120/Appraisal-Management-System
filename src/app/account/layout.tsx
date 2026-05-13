import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageAccount, requireActiveAccount } from "@/lib/tenant";
import { AccountShell } from "@/components/account-shell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const account = await requireActiveAccount(session.user);
  if (!(await canManageAccount(session.user, account.id))) {
    redirect("/unauthorized");
  }

  const activeOrganization = session.user.activeOrganizationId
    ? await prisma.organization.findUnique({
        where: { id: session.user.activeOrganizationId },
        select: { accountId: true, name: true, logoUrl: true },
      })
    : null;
  const sidebarOrganization =
    activeOrganization && activeOrganization.accountId === account.id ? activeOrganization : null;

  return (
    <AccountShell
      name={session.user.name ?? "Account"}
      email={session.user.email}
      organizationName={sidebarOrganization?.name ?? session.user.organizationName ?? account.name}
      organizationLogoUrl={sidebarOrganization?.logoUrl ?? null}
    >
      {children}
    </AccountShell>
  );
}
