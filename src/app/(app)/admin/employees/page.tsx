import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import { UserPlus, ChevronRight } from "lucide-react";

type UserWithExtras = Awaited<ReturnType<typeof loadUsers>>[number];

async function loadUsers() {
  return prisma.user.findMany({
    orderBy: [{ employeeNumber: "asc" }, { name: "asc" }],
    include: {
      salary: { select: { grossAnnum: true } },
      cyclesAsEmployee: {
        where: { status: { notIn: ["CLOSED", "DECIDED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, type: true },
      },
    },
  });
}

const SECTION_CONFIG = [
  { key: "PARTNER",    label: "Directors / Partners", roles: ["PARTNER"],    badgeClass: "ds-badge ds-badge-sq ds-badge-purple", delay: 0.08 },
  { key: "MANAGEMENT", label: "Management",           roles: ["MANAGEMENT"], badgeClass: "ds-badge ds-badge-sq ds-badge-blue",   delay: 0.12 },
  { key: "MANAGER",    label: "Managers",             roles: ["MANAGER"],    badgeClass: "ds-badge ds-badge-sq ds-badge-blue",   delay: 0.16 },
  { key: "TL",         label: "Team Leads",           roles: ["TL"],         badgeClass: "ds-badge ds-badge-sq ds-badge-amber",  delay: 0.20 },
  { key: "HR",         label: "HR Staff",             roles: ["HR"],         badgeClass: "ds-badge ds-badge-sq ds-badge-teal",   delay: 0.24 },
  { key: "ADMIN",      label: "Admins",               roles: ["ADMIN"],      badgeClass: "ds-badge ds-badge-sq ds-badge-orange", delay: 0.28 },
  { key: "EMPLOYEE",   label: "Staff",                roles: ["EMPLOYEE"],   badgeClass: "ds-badge ds-badge-sq ds-badge-gray",   delay: 0.32 },
] as const;

function EmployeeTable({ users, badgeClass, showCycle }: { users: UserWithExtras[]; badgeClass: string; showCycle: boolean }) {
  if (users.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-border bg-muted/40">
            <th className="py-2.5 px-4 ds-label">Emp #</th>
            <th className="px-4 ds-label">Name</th>
            <th className="px-4 ds-label">Role</th>
            <th className="px-4 ds-label">Department</th>
            <th className="px-4 ds-label">Location</th>
            <th className="px-4 ds-label">Joining</th>
            <th className="px-4 ds-label">Gross/yr</th>
            {showCycle && <th className="px-4 ds-label">Active Cycle</th>}
            <th className="px-4 ds-label w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => {
            const activeCycle = u.cyclesAsEmployee[0];
            return (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors cursor-pointer group">
                <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                  <Link href={`/admin/employees/${u.id}`} className="block">{u.employeeNumber ?? "—"}</Link>
                </td>
                <td className="px-4">
                  <Link href={`/admin/employees/${u.id}`} className="block font-semibold text-foreground hover:text-primary transition-colors">
                    {toTitleCase(u.name)}
                  </Link>
                </td>
                <td className="px-4">
                  <Link href={`/admin/employees/${u.id}`} className="block">
                    <span className={badgeClass}>{u.role}</span>
                    {u.secondaryRole && (
                      <span className="ml-1 ds-badge ds-badge-sq ds-badge-gray">{u.secondaryRole}</span>
                    )}
                  </Link>
                </td>
                <td className="px-4 text-muted-foreground text-xs">
                  <Link href={`/admin/employees/${u.id}`} className="block">{u.department ?? "—"}</Link>
                </td>
                <td className="px-4 text-muted-foreground text-xs">
                  <Link href={`/admin/employees/${u.id}`} className="block">{u.location ?? "—"}</Link>
                </td>
                <td className="px-4 text-muted-foreground font-mono text-xs">
                  <Link href={`/admin/employees/${u.id}`} className="block">
                    {u.joiningDate.toLocaleDateString()}
                  </Link>
                </td>
                <td className="px-4 text-muted-foreground text-xs">
                  <Link href={`/admin/employees/${u.id}`} className="block">
                    {u.salary ? `₹${Number(u.salary.grossAnnum).toLocaleString()}` : "—"}
                  </Link>
                </td>
                {showCycle && (
                  <td className="px-4">
                    <Link href={`/admin/employees/${u.id}`} className="block">
                      {activeCycle ? (
                        <span className="ds-badge ds-badge-cyan">
                          {activeCycle.type} · {activeCycle.status.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">None</span>
                      )}
                    </Link>
                  </td>
                )}
                <td className="px-4">
                  <Link href={`/admin/employees/${u.id}`} className="text-muted-foreground/40 group-hover:text-primary transition-colors">
                    <ChevronRight className="size-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function EmployeesPage() {
  const users = await loadUsers();

  const byRole = (roles: readonly string[]) => users.filter((u) => roles.includes(u.role));
  const appraisableRoles = new Set(["ADMIN", "MANAGER", "HR", "TL", "EMPLOYEE"]);

  return (
    <div className="space-y-5">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ds-h1">Employees</h1>
            <p className="ds-body mt-1">{users.length} total users</p>
          </div>
          <Link href="/admin/employees/new">
            <Button className="flex items-center gap-2">
              <UserPlus className="size-4" /> New Employee
            </Button>
          </Link>
        </div>
      </FadeIn>

      <div className="space-y-5">
        {SECTION_CONFIG.map((sec) => {
          const group = byRole(sec.roles);
          if (group.length === 0) return null;
          const showCycle = sec.roles.some((r) => appraisableRoles.has(r));
          return (
            <FadeIn key={sec.key} delay={sec.delay}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    {sec.label}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({group.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <EmployeeTable users={group} badgeClass={sec.badgeClass} showCycle={showCycle} />
                </CardContent>
              </Card>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
