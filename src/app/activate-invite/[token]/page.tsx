import Link from "next/link";
import { prisma } from "@/lib/db";
import { hashInviteToken } from "@/lib/invites";
import { activateInviteAction } from "./actions";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function ActivateInvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: {
      account: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="ds-label text-primary">Invite activation</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Invite unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This invite is invalid, already used, or has expired. Ask your account owner or organization admin to resend the invitation.
          </p>
          <Link href="/login" className="mt-6 inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
            Return to login
          </Link>
        </section>
      </main>
    );
  }

  const activate = activateInviteAction.bind(null, token);
  const targetName = invite.organization?.name ?? invite.account?.name ?? "your workspace";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="ds-label text-primary">Invite activation</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Set your password</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          You were invited to join <span className="font-medium text-foreground">{targetName}</span> as{" "}
          <span className="font-medium text-foreground">{formatLabel(invite.organizationRole ?? invite.accountRole ?? "MEMBER")}</span>.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">{invite.name ?? "Invited user"}</div>
          <div>{invite.email}</div>
        </div>

        <form action={activate} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <button type="submit" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
            Activate account
          </button>
        </form>
      </section>
    </main>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
