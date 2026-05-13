import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumb";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function BirthdaysPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const employees = await prisma.user.findMany({
    where: { organizationId: session.user.activeOrganizationId ?? "default-org", active: true, dob: { not: null } },
    select: { id: true, name: true, dob: true, designation: true, employeeNumber: true },
    orderBy: { name: "asc" },
  });

  type BirthdayEntry = { id: string; name: string; dob: Date; designation: string | null; employeeNumber: number | null; dayOfMonth: number };

  const byMonth = new Map<number, BirthdayEntry[]>();
  for (const emp of employees) {
    if (!emp.dob) continue;
    const m = emp.dob.getMonth(); // 0-indexed
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push({ ...emp, dob: emp.dob, dayOfMonth: emp.dob.getDate() });
  }

  const currentMonth = new Date().getMonth();

  const sortedMonths = [
    ...Array.from({ length: 12 }, (_, i) => (currentMonth + i) % 12),
  ].filter((m) => byMonth.has(m));

  return (
    <FadeIn>
      <div className="p-6 space-y-6">
        <div>
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Tracking", href: "/hrms/tracking" }, { label: "Birthdays" }]} />
          <h1 className="text-2xl font-bold text-foreground mt-1">Employee Birthdays</h1>
          <p className="text-sm text-muted-foreground mt-1">{employees.length} employees with birthday on record</p>
        </div>

        {sortedMonths.length === 0 && (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No birthday data recorded.</CardContent></Card>
        )}

        {sortedMonths.map((monthIdx) => {
          const people = byMonth.get(monthIdx)!.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
          const isCurrentMonth = monthIdx === currentMonth;
          return (
            <Card key={monthIdx} className={isCurrentMonth ? "border-primary/50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {MONTHS[monthIdx]}
                  {isCurrentMonth && <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">This month</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {people.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">{MONTHS[monthIdx]} {p.dayOfMonth}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </FadeIn>
  );
}

