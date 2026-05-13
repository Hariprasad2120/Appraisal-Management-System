import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { createAnnouncementAction } from "../actions";

export default function NewAnnouncementPage() {
  return (
    <FadeIn>
      <div className="p-6 max-w-2xl space-y-6">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Announcements", href: "/hrms/announcements" }, { label: "New" }]} />
          <h1 className="text-2xl font-bold text-foreground">New Announcement</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Announcement Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAnnouncementAction} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="audience">Audience</Label>
                <select id="audience" name="audience" required className="w-full border rounded px-3 py-2 text-sm mt-1 bg-background">
                  <option value="ORG">Entire Organisation</option>
                  <option value="DEPARTMENT">Department</option>
                  <option value="DIVISION">Division</option>
                </select>
              </div>
              <div>
                <Label htmlFor="targetId">Target ID (department/division, optional)</Label>
                <Input id="targetId" name="targetId" placeholder="Leave blank for org-wide" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="publishedAt">Publish Date</Label>
                  <Input id="publishedAt" name="publishedAt" type="date" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="expiresAt">Expires</Label>
                  <Input id="expiresAt" name="expiresAt" type="date" className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" name="body" rows={8} required className="mt-1" />
              </div>
              <Button type="submit" className="w-full">Publish Announcement</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

