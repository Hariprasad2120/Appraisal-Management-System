import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { ExtensionActions } from "./extension-actions";

export default async function ExtensionsPage() {
  const extensions = await prisma.extensionRequest.findMany({
    include: {
      cycle: { include: { user: true } },
      requester: { select: { name: true, role: true } },
      decidedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pending = extensions.filter((e) => e.status === "PENDING");
  const decided = extensions.filter((e) => e.status !== "PENDING");

  const employeeLink = (id: string, name: string, className?: string) => (
    <Link
      href={`/workspace/hrms/employees/${id}/assign`}
      className={`transition-colors hover:text-primary hover:underline ${className ?? ""}`}
    >
      {toTitleCase(name)}
    </Link>
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="ds-h1">Extension Requests</h1>
        <p className="ds-body mt-1">{pending.length} pending approval</p>
      </FadeIn>

      {pending.length > 0 && (
        <FadeIn delay={0.1}>
          <Card className="border-0 shadow-sm border-l-4 border-l-orange-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-orange-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pending.map((extension) => (
                <div
                  key={extension.id}
                  className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {employeeLink(extension.cycle.user.id, extension.cycle.user.name)}{" "}
                        - {extension.requester.role}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Requested by {toTitleCase(extension.requester.name)} on{" "}
                        {extension.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    <ExtensionActions extensionId={extension.id} />
                  </div>
                  <p className="rounded bg-slate-50 p-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {extension.reason}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {decided.length > 0 && (
        <FadeIn delay={0.2}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Decided</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="py-2.5 px-4 ds-label">Employee</th>
                    <th className="px-4 ds-label">Requester</th>
                    <th className="px-4 ds-label">Status</th>
                    <th className="px-4 ds-label">Extended Until</th>
                    <th className="px-4 ds-label">Decided By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {decided.map((extension) => (
                    <tr key={extension.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">
                        {employeeLink(extension.cycle.user.id, extension.cycle.user.name)}
                      </td>
                      <td className="px-4 text-slate-500">
                        {toTitleCase(extension.requester.name)}
                      </td>
                      <td className="px-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            extension.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {extension.status}
                        </span>
                      </td>
                      <td className="px-4 text-slate-500">
                        {extension.extendedUntil?.toLocaleDateString() ?? "-"}
                      </td>
                      <td className="px-4 text-slate-500">
                        {extension.decidedBy?.name ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {extensions.length === 0 && (
        <FadeIn delay={0.1}>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground/50">
              No extension requests yet.
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
