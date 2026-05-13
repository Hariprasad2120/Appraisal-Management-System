import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FadeIn } from "@/components/motion-div";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { archivePolicyAction } from "../actions";
import { getHrmsPoliciesPath, getHrmsPolicyEditPath } from "@/modules/hrms/lib/routes";

type PolicyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PolicyDetailPage({ params }: PolicyDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const policy = await prisma.policy.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
    },
  });

  if (!policy || policy.organizationId !== (session.user.activeOrganizationId ?? "default-org")) {
    notFound();
  }

  const canManage = session.user.role === "ADMIN" || session.user.role === "HR";
  const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
    PUBLISHED: "default",
    DRAFT: "outline",
    ARCHIVED: "secondary",
  };

  return (
    <FadeIn>
      <div className="max-w-4xl space-y-6 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Breadcrumbs
              items={[
                { label: "HRMS", href: "/hrms" },
                { label: "Policies", href: "/hrms/policies" },
                { label: policy.title },
              ]}
            />
            <h1 className="text-2xl font-bold text-foreground">{policy.title}</h1>
            <p className="text-sm text-muted-foreground">
              {policy.category} · v{policy.version}
              {policy.effectiveFrom ? ` · Effective ${policy.effectiveFrom.toLocaleDateString()}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[policy.status] ?? "secondary"}>{policy.status}</Badge>
            {canManage ? (
              <>
                <Link href={getHrmsPolicyEditPath(policy.id)}>
                  <Button size="sm" variant="outline">Edit</Button>
                </Link>
                {policy.status !== "ARCHIVED" ? (
                  <form action={archivePolicyAction.bind(null, policy.id)}>
                    <Button size="sm" variant="ghost" type="submit">Archive</Button>
                  </form>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Policy Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Created by {policy.createdBy?.name ?? "Unknown"} on {policy.createdAt.toLocaleDateString()}
            </div>
            <div className="whitespace-pre-wrap rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6">
              {policy.body}
            </div>
          </CardContent>
        </Card>

        <div>
          <Link href={getHrmsPoliciesPath()}>
            <Button variant="outline">Back To Policies</Button>
          </Link>
        </div>
      </div>
    </FadeIn>
  );
}
