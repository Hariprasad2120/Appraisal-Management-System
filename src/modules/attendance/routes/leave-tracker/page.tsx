import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";

const TILES = [
  { href: "/admin/ot/leave-tracker/leaves", label: "Leaves", icon: CalendarDays, desc: "Leave applications, approvals and balance ledger" },
  { href: "/admin/ot/leave-tracker/permissions", label: "Permissions", icon: Clock, desc: "Short permission slips with approval flow" },
];

export default function LeaveTrackerIndexPage() {
  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage employee leaves and short permissions</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TILES.map((tile) => (
            <Link key={tile.href} href={tile.href}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                <CardHeader className="pb-2">
                  <tile.icon className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardHeader>
                <CardContent className="pt-0">
                  <CardTitle className="text-base font-semibold">{tile.label}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{tile.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}
