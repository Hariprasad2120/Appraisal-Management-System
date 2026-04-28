import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteEmployeeAction, deleteSalaryAction, toggleActiveAction } from "../actions";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import { canBeAppraised, isAdmin } from "@/lib/rbac";
import {
  User, Calendar, Briefcase, MapPin, Phone, Mail,
  IndianRupee, ChevronRight, ShieldOff, ShieldCheck,
} from "lucide-react";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const canEdit = session?.user ? isAdmin(session.user.role, session.user.secondaryRole) : false;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      salary: true,
      reportingManager: { select: { id: true, name: true, employeeNumber: true } },
      cyclesAsEmployee: {
        orderBy: { startDate: "desc" },
        take: 5,
        select: { id: true, type: true, status: true, startDate: true },
      },
    },
  });
  if (!user) notFound();

  const grossAnnum = user.salary ? Number(user.salary.grossAnnum) : null;
  const isAppraisable = canBeAppraised(user.role);

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    MANAGEMENT: "bg-purple-100 text-purple-700",
    MANAGER: "bg-blue-100 text-blue-700",
    HR: "bg-green-100 text-green-700",
    TL: "bg-amber-100 text-amber-700",
    EMPLOYEE: "bg-slate-100 text-slate-600",
    PARTNER: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/employees" className="text-xs text-slate-400 hover:text-slate-600">
              ← Employees
            </Link>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Link href={`/admin/employees/${user.id}/edit`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
              <form action={toggleActiveAction}>
                <input type="hidden" name="id" value={user.id} />
                <input type="hidden" name="active" value={String(user.active)} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className={user.active
                    ? "text-orange-600 border-orange-300 hover:bg-orange-50"
                    : "text-green-600 border-green-300 hover:bg-green-50"}
                >
                  {user.active ? (
                    <><ShieldOff className="size-3.5 mr-1.5" /> Revoke Access</>
                  ) : (
                    <><ShieldCheck className="size-3.5 mr-1.5" /> Restore Access</>
                  )}
                </Button>
              </form>
              <form action={deleteEmployeeAction}>
                <input type="hidden" name="id" value={user.id} />
                <Button type="submit" variant="destructive" size="sm">Delete</Button>
              </form>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Header card */}
      <FadeIn delay={0.05}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-300 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isAppraisable ? (
                    canEdit ? (
                      <Link href={`/admin/employees/${user.id}/assign`}>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white hover:text-[#008993] transition-colors cursor-pointer">
                          {toTitleCase(user.name)}
                        </h1>
                      </Link>
                    ) : (
                      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        {toTitleCase(user.name)}
                      </h1>
                    )
                  ) : (
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                      {toTitleCase(user.name)}
                    </h1>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user.role] ?? "bg-slate-100 text-slate-600"}`}>
                    {user.role}
                  </span>
                  {!user.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {user.designation ?? "—"} · {user.department ?? "—"}
                  {user.employeeNumber && ` · Emp #${user.employeeNumber}`}
                </p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                  {user.email && <span className="flex items-center gap-1"><Mail className="size-3" />{user.email}</span>}
                  {user.workPhone && <span className="flex items-center gap-1"><Phone className="size-3" />{user.workPhone}</span>}
                  {user.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{user.location}</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Basic info */}
        <FadeIn delay={0.1}>
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4" /> Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <InfoRow label="First Name" value={toTitleCase(user.firstName)} />
                <InfoRow label="Last Name" value={toTitleCase(user.lastName)} />
                <InfoRow label="Father Name" value={toTitleCase(user.fatherName)} />
                <InfoRow label="DOB" value={user.dob?.toLocaleDateString()} />
                <InfoRow label="Gender" value={user.gender} />
                <InfoRow label="Marital Status" value={user.maritalStatus} />
                <InfoRow label="Personal Email" value={user.personalEmail} />
                <InfoRow label="Personal Phone" value={user.personalPhone} />
                <InfoRow label="Aadhaar" value={user.aadhaar} />
                <InfoRow label="PAN" value={user.pan} />
                <InfoRow label="UAN" value={user.uan} />
              </dl>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Employment info */}
        <FadeIn delay={0.12}>
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="size-4" /> Employment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <InfoRow label="Joining Date" value={user.joiningDate.toLocaleDateString()} />
                <InfoRow label="Employment Type" value={user.employmentType} />
                <InfoRow label="Employee Status" value={user.employeeStatus} />
                <InfoRow label="Source of Hire" value={user.sourceOfHire} />
                <InfoRow label="Zoho Role" value={user.zohoRole} />
                <InfoRow
                  label="Reporting Manager"
                  value={
                    user.reportingManager
                      ? `${toTitleCase(user.reportingManager.name)} (#${user.reportingManager.employeeNumber ?? "—"})`
                      : undefined
                  }
                />
                <InfoRow label="Present Address" value={user.presentAddress} />
                <InfoRow label="Permanent Address" value={user.permanentAddress} />
              </dl>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Salary */}
        <FadeIn delay={0.14}>
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <IndianRupee className="size-4" /> Salary Details
                </span>
                <Link href={`/admin/employees/${user.id}/edit?tab=salary`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    {user.salary ? "Edit" : "Add"}
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.salary ? (
                <dl className="space-y-2.5 text-sm">
                  <InfoRow label="Gross (Annual)" value={`₹${Number(user.salary.grossAnnum).toLocaleString()}`} highlight />
                  <InfoRow label="Gross (Monthly)" value={`₹${Math.round(Number(user.salary.grossAnnum) / 12).toLocaleString()}`} highlight />
                  <InfoRow label="CTC (Annual)" value={`₹${Number(user.salary.ctcAnnum).toLocaleString()}`} />
                  <InfoRow label="Basic" value={`₹${Number(user.salary.basic).toLocaleString()}`} />
                  <InfoRow label="HRA" value={`₹${Number(user.salary.hra).toLocaleString()}`} />
                  <InfoRow label="Conveyance" value={`₹${Number(user.salary.conveyance).toLocaleString()}`} />
                  <InfoRow label="Fixed Allowance" value={`₹${Number(user.salary.fixedAllowance).toLocaleString()}`} />
                  <InfoRow label="Stipend" value={`₹${Number(user.salary.stipend).toLocaleString()}`} />
                  <div className="pt-2">
                    <form action={deleteSalaryAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                        Clear salary record
                      </button>
                    </form>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate-400">No salary record.</p>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Bank + appraisal history */}
        <FadeIn delay={0.16}>
          <div className="space-y-5">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bank Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2.5 text-sm">
                  <InfoRow label="Bank" value={user.bankName} />
                  <InfoRow label="Account #" value={user.bankAccount} />
                  <InfoRow label="IFSC" value={user.ifsc} />
                  <InfoRow label="Account Type" value={user.accountType} />
                  <InfoRow label="State Code" value={user.stateCode} />
                </dl>
              </CardContent>
            </Card>

            {user.cyclesAsEmployee.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="size-4" /> Appraisal Cycles
                    </span>
                    {isAppraisable && canEdit && (
                      <Link href={`/admin/employees/${user.id}/assign`} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                        Assign <ChevronRight className="size-3" />
                      </Link>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-400 border-b bg-slate-50 dark:bg-slate-800/50">
                        <th className="py-2 px-4 font-medium">Type</th>
                        <th className="px-4 font-medium">Started</th>
                        <th className="px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {user.cyclesAsEmployee.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-4">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                              {c.type}
                            </span>
                          </td>
                          <td className="px-4 text-slate-500">{c.startDate.toLocaleDateString()}</td>
                          <td className="px-4">
                            <span className="text-blue-600 dark:text-blue-400">
                              {c.status.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

          </div>
        </FadeIn>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-slate-400 shrink-0">{label}</dt>
      <dd className={`text-right truncate ${highlight ? "font-semibold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}
