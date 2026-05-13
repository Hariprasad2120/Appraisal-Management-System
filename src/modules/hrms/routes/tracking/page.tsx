import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Cake, Star } from "lucide-react";

const TILES = [
  { href: "/hrms/tracking/birthdays", label: "Birthdays", icon: Cake, desc: "Employee birthday calendar by month" },
  { href: "/hrms/tracking/employee-of-month", label: "Employee of the Month", icon: Star, desc: "Nominate and announce EOM winners" },
];

export default function TrackingIndexPage() {
  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div>
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Tracking" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">People milestones and recognition</p>
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

