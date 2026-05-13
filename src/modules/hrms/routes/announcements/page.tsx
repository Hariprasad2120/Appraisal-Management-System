import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { deleteAnnouncementAction } from "./actions";

type SearchParams = { audience?: string };

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const orgId = session.user.activeOrganizationId ?? "default-org";

  const announcements = await prisma.announcement.findMany({
    where: {
      organizationId: orgId,
      ...(sp.audience ? { audience: sp.audience as "ORG" | "DEPARTMENT" | "DIVISION" } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const audienceVariant: Record<string, "default" | "secondary" | "outline"> = {
    ORG: "default",
    DEPARTMENT: "outline",
    DIVISION: "secondary",
  };

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Announcements" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">Announcements</h1>
            <p className="text-sm text-muted-foreground mt-1">{announcements.length} announcements</p>
          </div>
          <Link href="/hrms/announcements/new" className="inline-flex items-center gap-1 h-7 rounded-xl bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/85 transition-all">
            <Plus className="size-3.5" /> New
          </Link>
        </div>

        <div className="flex gap-2">
          {(["", "ORG", "DEPARTMENT", "DIVISION"] as const).map((a) => (
            <Link
              key={a}
              href={a ? `/workspace/hrms/announcements?audience=${a}` : "/hrms/announcements"}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                (sp.audience ?? "") === a
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {a || "All"}
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          {announcements.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No announcements.</CardContent></Card>
          )}
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={audienceVariant[a.audience] ?? "secondary"}>{a.audience}</Badge>
                    {a.publishedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.publishedAt).toLocaleDateString("en-IN")}
                      </span>
                    )}
                    {a.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        expires {new Date(a.expiresAt).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
                <form action={deleteAnnouncementAction.bind(null, a.id)}>
                  <Button type="submit" variant="ghost" size="icon"><Trash2 className="size-4 text-destructive" /></Button>
                </form>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

