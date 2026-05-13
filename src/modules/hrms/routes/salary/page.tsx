import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { TrendingUp, FileSpreadsheet, CreditCard, Banknote } from "lucide-react";

const TILES = [
  { href: "/hrms/salary/revisions", label: "Salary Revisions", icon: TrendingUp, desc: "View appraisal-driven salary revision history" },
  { href: "/hrms/salary/sheets", label: "Salary Sheet", icon: FileSpreadsheet, desc: "Interactive salary component calculator" },
  { href: "/hrms/salary/loans", label: "Loans", icon: CreditCard, desc: "Employee loan records & repayment schedules" },
  { href: "/hrms/salary/advances", label: "Advances", icon: Banknote, desc: "Salary advance requests & approvals" },
];

export default function SalaryIndexPage() {
  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div>
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Salary" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">Salary</h1>
          <p className="text-sm text-muted-foreground mt-1">Salary revisions, calculators, loans and advances</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

