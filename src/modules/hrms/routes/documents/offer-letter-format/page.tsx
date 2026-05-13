import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { saveTemplateAction, deleteTemplateAction } from "./actions";
import { Plus, Trash2 } from "lucide-react";

const COMMON_TOKENS = ["{{employee_name}}", "{{designation}}", "{{joining_date}}", "{{salary}}", "{{department}}", "{{company_name}}", "{{location}}"];

export default async function OfferLetterFormatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const templates = await prisma.offerLetterTemplate.findMany({
    where: { organizationId: session.user.activeOrganizationId ?? "default-org" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div>
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Documents", href: "/hrms/documents" }, { label: "Offer Letter Format" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">Offer Letter Format</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage offer letter templates with dynamic variable tokens</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Plus className="size-4" /> New Template</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveTemplateAction} className="space-y-4">
              <input type="hidden" name="id" value="" />
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input id="name" name="name" placeholder="e.g. Standard Offer Letter" required className="mt-1" />
              </div>
              <div>
                <Label>Available Tokens</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COMMON_TOKENS.map((t) => (
                    <code key={t} className="text-xs bg-muted rounded px-2 py-1">{t}</code>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="bodyHtml">Template Body (HTML)</Label>
                <Textarea id="bodyHtml" name="bodyHtml" rows={12} className="mt-1 font-mono text-xs" placeholder="<p>Dear {{employee_name}},</p>..." />
              </div>
              <input type="hidden" name="variables" value={JSON.stringify(COMMON_TOKENS)} />
              <Button type="submit">Save Template</Button>
            </form>
          </CardContent>
        </Card>

        {templates.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saved Templates</h2>
            {templates.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <form action={deleteTemplateAction.bind(null, t.id)}>
                    <Button type="submit" variant="ghost" size="icon"><Trash2 className="size-4 text-destructive" /></Button>
                  </form>
                </CardHeader>
                <CardContent>
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Preview HTML</summary>
                    <pre className="mt-2 whitespace-pre-wrap bg-muted rounded p-3 overflow-auto max-h-64">{t.bodyHtml}</pre>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FadeIn>
  );
}

