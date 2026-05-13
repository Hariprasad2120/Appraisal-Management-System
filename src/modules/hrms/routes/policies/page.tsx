import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Plus } from "lucide-react";
import { archivePolicyAction } from "./actions";
import { getHrmsPolicyEditPath, getHrmsPolicyPath } from "@/modules/hrms/lib/routes";

export default async function PoliciesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const policies = await prisma.policy.findMany({
    where: { organizationId: session.user.activeOrganizationId ?? "default-org" },
    orderBy: { createdAt: "desc" },
  });

  const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
    PUBLISHED: "default",
    DRAFT: "outline",
    ARCHIVED: "secondary",
  };

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Policies" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">Policies</h1>
            <p className="text-sm text-muted-foreground mt-1">{policies.length} policies</p>
          </div>
          <Link href="/hrms/policies/new" className="inline-flex items-center gap-1 h-7 rounded-xl bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/85 transition-all">
            <Plus className="size-3.5" /> New Policy
          </Link>
        </div>

        <div className="space-y-3">
          {policies.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No policies yet.</CardContent></Card>
          )}
          {policies.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <Link href={getHrmsPolicyPath(p.id)}>
                    <CardTitle className="text-base hover:text-primary transition-colors cursor-pointer">{p.title}</CardTitle>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.category} Â· v{p.version}</p>
                </div>
                <Badge variant={statusVariant[p.status] ?? "secondary"}>{p.status}</Badge>
              </CardHeader>
              <CardContent className="flex gap-2 pt-0">
                <Link href={getHrmsPolicyEditPath(p.id)} className="inline-flex items-center h-7 rounded-xl border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted transition-all">Edit</Link>
                {p.status !== "ARCHIVED" && (
                  <form action={archivePolicyAction.bind(null, p.id)}>
                    <Button type="submit" variant="ghost" size="sm">Archive</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

