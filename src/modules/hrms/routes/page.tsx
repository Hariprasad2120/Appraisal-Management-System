import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Wallet,
  FileText,
  FileSpreadsheet,
  BookOpen,
  TrendingUp,
  Megaphone,
} from "lucide-react";

const TILES = [
  { href: "/hrms/employees", label: "Employees", icon: Users, desc: "Manage all employee records" },
  { href: "/hrms/ownership", label: "Ownership", icon: UserCheck, desc: "TL & Manager assignments" },
  { href: "/hrms/salary", label: "Salary", icon: Wallet, desc: "Revisions, sheets, loans & advances" },
  { href: "/hrms/documents", label: "Documents", icon: FileText, desc: "Offer letters & onboarding files" },
  { href: "/hrms/payroll", label: "Payroll", icon: FileSpreadsheet, desc: "Generate payslips & OT summary" },
  { href: "/hrms/policies", label: "Policies", icon: BookOpen, desc: "HR policies & handbooks" },
  { href: "/hrms/tracking", label: "Tracking", icon: TrendingUp, desc: "Birthdays & employee of the month" },
  { href: "/hrms/announcements", label: "Announcements", icon: Megaphone, desc: "Org, department & division notices" },
];

export default async function HrmsDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [employeeCount, activeCount] = await Promise.all([
    prisma.user.count({ where: { organizationId: session.user.activeOrganizationId ?? "default-org" } }),
    prisma.user.count({ where: { organizationId: session.user.activeOrganizationId ?? "default-org", active: true } }),
  ]);

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div>
          <Breadcrumbs items={[{ label: "HRMS" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">Human Resource Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} active Â· {employeeCount} total employees
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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

