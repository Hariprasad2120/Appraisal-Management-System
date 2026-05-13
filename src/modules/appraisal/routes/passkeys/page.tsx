import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { decidePasskeyResetAction, forcePasskeyResetAction } from "./actions";

export default async function AdminPasskeysPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return null;

  const [requests, users] = await Promise.all([
    prisma.passkeyResetRequest.findMany({
      orderBy: { requestedAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true } }, decidedBy: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, passkeySetupRequired: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ds-h1">Passkey Resets</h1>
        <p className="ds-body mt-1">Approve requests or force a user to set a new passkey on next login.</p>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Reset requests</div>
        <div className="divide-y divide-border">
          {requests.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">No passkey reset requests.</p>
          ) : requests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{request.user.name}</p>
                <p className="text-xs text-muted-foreground">{request.user.email} · {request.requestedAt.toLocaleString("en-IN")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border px-2 py-1 text-xs">{request.status}</span>
                {request.status === "PENDING" && (
                  <>
                    <form action={decidePasskeyResetAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <Button size="sm">Approve</Button>
                    </form>
                    <form action={decidePasskeyResetAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <Button size="sm" variant="outline">Reject</Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Force passkey reset</div>
        <div className="divide-y divide-border">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <form action={forcePasskeyResetAction}>
                <input type="hidden" name="userId" value={user.id} />
                <Button size="sm" variant="outline" disabled={user.passkeySetupRequired}>
                  {user.passkeySetupRequired ? "Reset pending" : "Force reset"}
                </Button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
