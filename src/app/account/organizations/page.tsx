import Image from "next/image";
import { redirect } from "next/navigation";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrganizationLogoUrl } from "@/lib/organization-branding";
import { getUserOrganizationMemberships } from "@/lib/tenant";
import { switchActiveOrganizationAction } from "@/app/account/organizations/actions";

export default async function AccountOrganizationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const memberships = await getUserOrganizationMemberships(session.user.id);
  if (memberships.length === 0) {
    redirect("/no-organization-access");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="ds-label text-primary">Workspace switcher</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Choose your active organization</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Switching organization updates the active dashboard context and returns you to the organization hub.
          </p>
        </header>

        <section className="grid gap-4">
          {memberships.map((membership) => {
            const isActive = membership.organization.id === session.user.activeOrganizationId;
            const roles = membership.roleAssignments.map((assignment) =>
              assignment.role
                .toLowerCase()
                .split("_")
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" "),
            );

            return (
              <form
                key={membership.id}
                action={switchActiveOrganizationAction}
                className={`rounded-2xl border p-5 shadow-sm transition ${
                  isActive ? "border-primary/35 bg-primary/5" : "border-border bg-card"
                }`}
              >
                <input type="hidden" name="organizationId" value={membership.organization.id} />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background p-2 text-primary shadow-sm">
                      <Image
                        src={getOrganizationLogoUrl(membership.organization.logoUrl)}
                        alt={membership.organization.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">{membership.organization.name}</h2>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                            <CheckCircle2 className="size-3.5" />
                            Active
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">/{membership.organization.slug}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {roles.map((role) => (
                          <span key={`${membership.id}-${role}`} className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{membership.organization.account.name}</div>
                      <div>{membership.organization.status}</div>
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                    >
                      <RefreshCw className="size-4" />
                      {isActive ? "Refresh dashboard" : "Switch here"}
                    </button>
                  </div>
                </div>
              </form>
            );
          })}
        </section>
      </div>
    </main>
  );
}
