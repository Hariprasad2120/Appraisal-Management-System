import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignForm } from "./assign-form";
import { DemoControls } from "./demo-controls";
import { ForceAvailableButton } from "./force-available-button";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import {
  getAppraisalEligibility,
  autoCycleType,
} from "@/lib/appraisal-eligibility";
import { canBeAppraised } from "@/lib/rbac";
import { isDateReached } from "@/lib/business-days";
import {
  Calendar,
  User,
  IndianRupee,
  TrendingUp,
  ExternalLink,
  CheckCircle,
  Circle,
  Clock,
  ClipboardList,
  Star,
  FileCheck,
  CalendarCheck,
} from "lucide-react";
import Link from "next/link";

export default async function AssignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await prisma.user.findUnique({
    where: { id },
    include: { salary: true },
  });
  if (!employee || !canBeAppraised(employee.role)) notFound();

  const [hrUsers, tlUsers, mgrUsers] = await Promise.all([
    prisma.user.findMany({
      where: { role: "HR", active: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "TL", active: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "MANAGER", active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const existingCycle = await prisma.appraisalCycle.findFirst({
    where: { userId: id, status: { notIn: ["CLOSED"] } },
    include: {
      assignments: {
        include: { reviewer: { select: { id: true, name: true, role: true } } },
      },
      self: true,
      ratings: {
        select: {
          role: true,
          reviewerId: true,
          submittedAt: true,
          averageScore: true,
        },
      },
      decision: { include: { slab: true } },
      moms: { where: { role: "MANAGEMENT" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const eligibility = getAppraisalEligibility(employee.joiningDate, now);
  const autoType = autoCycleType(employee.joiningDate, now);

  const monthsTenure =
    (now.getFullYear() - employee.joiningDate.getFullYear()) * 12 +
    (now.getMonth() - employee.joiningDate.getMonth());

  const grossAnnum = employee.salary
    ? Number(employee.salary.grossAnnum)
    : null;

  const revisions = await prisma.salaryRevision.findMany({
    where: { userId: id },
    orderBy: { effectiveFrom: "desc" },
    take: 5,
  });

  const selfSubmitted = !!existingCycle?.self?.submittedAt;
  const selfDeadlinePassed = existingCycle?.self
    ? new Date() > existingCycle.self.editableUntil
    : false;

  // Cycle is editable (reassign reviewers) only if no one has confirmed availability yet and no ratings exist
  const anyAvailabilityConfirmed =
    existingCycle?.assignments.some((a) => a.availability !== "PENDING") ??
    false;
  const hasRatings = (existingCycle?.ratings.length ?? 0) > 0;
  const cycleIsEditable = !anyAvailabilityConfirmed && !hasRatings;

  // Timeline stages for progress display
  const allAvailable =
    existingCycle?.assignments.every((a) => a.availability === "AVAILABLE") ??
    false;
  const allRated = existingCycle
    ? existingCycle.ratings.length >=
        existingCycle.assignments.filter((a) => a.availability === "AVAILABLE")
          .length && existingCycle.assignments.length > 0
    : false;
  const hasDecision = !!existingCycle?.decision;
  const hasScheduledDate = !!existingCycle?.scheduledDate;
  const hasMom = (existingCycle?.moms.length ?? 0) > 0;
  const meetingPassed = existingCycle?.scheduledDate
    ? isDateReached(existingCycle.scheduledDate)
    : false;

  return (
    <div className="w-full max-w-7xl space-y-5">
      <FadeIn>
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/admin/appraisals"
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            ← Back to Appraisals
          </Link>
          <Link
            href={`/admin/employees/${employee.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <User className="size-3.5" />
            Employee Details
          </Link>
        </div>
        <div className="mt-2">
          <h1 className="ds-h1">{toTitleCase(employee.name)}</h1>
          <p className="ds-body mt-1">
            {employee.department ?? "—"} · {employee.designation ?? "—"}
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1 mb-0.5">
                <User className="size-3" /> Emp #
              </div>
              <div className="font-medium">
                {employee.employeeNumber ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1 mb-0.5">
                <Calendar className="size-3" /> Joining Date
              </div>
              <div className="font-medium">
                {employee.joiningDate.toLocaleDateString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Tenure</div>
              <div className="font-medium">
                {monthsTenure >= 12
                  ? `${Math.floor(monthsTenure / 12)}y ${monthsTenure % 12}m`
                  : `${monthsTenure} month${monthsTenure !== 1 ? "s" : ""}`}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Type</div>
              <div
                className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                  monthsTenure < 12
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {monthsTenure < 12 ? "Fresher" : "Experienced"}
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Active cycle status panel */}
      {existingCycle && existingCycle.assignments.length > 0 && (
        <FadeIn delay={0.07}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Cycle Status
                <span className="ml-auto text-xs font-normal text-slate-500">
                  {existingCycle.type} ·{" "}
                  {existingCycle.status.replace(/_/g, " ")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Self-assessment status */}
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">
                  Self-Assessment
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {selfSubmitted ? (
                    <CheckCircle className="size-4 text-green-500 shrink-0" />
                  ) : selfDeadlinePassed ? (
                    <Circle className="size-4 text-red-400 shrink-0" />
                  ) : (
                    <Clock className="size-4 text-amber-400 shrink-0" />
                  )}
                  <span className="text-slate-700 dark:text-slate-300 flex-1">
                    {toTitleCase(employee.name)}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      selfSubmitted
                        ? "bg-green-100 text-green-700"
                        : selfDeadlinePassed
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selfSubmitted
                      ? "Submitted"
                      : selfDeadlinePassed
                        ? "Deadline passed"
                        : `Due ${existingCycle.self?.editableUntil.toLocaleDateString("en-IN")}`}
                  </span>
                </div>
              </div>

              {/* Reviewer availability + rating status */}
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">
                  Reviewers
                </div>
                <div className="space-y-2">
                  {existingCycle.assignments.map((a) => {
                    const rating = existingCycle.ratings.find(
                      (r) => r.reviewerId === a.reviewer.id,
                    );
                    return (
                      <div key={a.id} className="flex items-center gap-2.5">
                        {/* Availability indicator */}
                        <div className="flex items-center gap-1.5 w-28 shrink-0">
                          {a.availability === "AVAILABLE" ? (
                            <CheckCircle className="size-3.5 text-green-500" />
                          ) : a.availability === "NOT_AVAILABLE" ? (
                            <Circle className="size-3.5 text-red-400" />
                          ) : (
                            <Clock className="size-3.5 text-amber-400" />
                          )}
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {a.role}
                          </span>
                        </div>

                        <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">
                          {toTitleCase(a.reviewer.name)}
                        </span>

                        {/* Availability badge */}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            a.availability === "AVAILABLE"
                              ? "bg-green-100 text-green-700"
                              : a.availability === "NOT_AVAILABLE"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {a.availability === "AVAILABLE"
                            ? "Available"
                            : a.availability === "NOT_AVAILABLE"
                              ? "Not Available"
                              : "Pending"}
                        </span>

                        {/* Rating badge */}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            rating
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {rating
                            ? `Rated ${rating.averageScore.toFixed(1)}`
                            : "Not Rated"}
                        </span>

                        {/* Force available action for NOT_AVAILABLE reviewers */}
                        {a.availability === "NOT_AVAILABLE" && (
                          <ForceAvailableButton assignmentId={a.id} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Salary & Revision History */}
      <FadeIn delay={0.08}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="size-4" /> Salary & Revision History
              </CardTitle>
              <Link
                href={`/admin/salary-revisions?emp=${employee.employeeNumber ?? ""}`}
                className="flex items-center gap-1 text-xs text-[#008993] hover:text-[#00cec4] transition-colors"
              >
                View all <ExternalLink className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {grossAnnum ? (
              <div className="flex flex-wrap gap-6 text-sm mb-4">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    Current Gross (Annual)
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    ₹{grossAnnum.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    Current Gross (Monthly)
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    ₹{Math.round(grossAnnum / 12).toLocaleString()}
                  </div>
                </div>
                {employee.salary && (
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">
                      CTC (Annual)
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      ₹{Number(employee.salary.ctcAnnum).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-4">
                No salary record.{" "}
                <a
                  href={`/admin/employees/${employee.id}/edit?tab=salary`}
                  className="text-[#008993] underline"
                >
                  Add salary
                </a>
              </p>
            )}

            {revisions.length > 0 ? (
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <TrendingUp className="size-3" /> Recent Revisions
                </div>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <th className="py-1.5 pr-3 font-medium">Effective</th>
                        <th className="py-1.5 pr-3 font-medium">Gross</th>
                        <th className="py-1.5 pr-3 font-medium">CTC</th>
                        <th className="py-1.5 pr-3 font-medium">Revised CTC</th>
                        <th className="py-1.5 pr-3 font-medium">Rev %</th>
                        <th className="py-1.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {revisions.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-400">
                            {r.effectiveFrom.toLocaleDateString("en-IN", {
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">
                            ₹{Number(r.grossAnnum).toLocaleString()}
                          </td>
                          <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">
                            ₹{Number(r.ctcAnnum).toLocaleString()}
                          </td>
                          <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-white">
                            ₹{Number(r.revisedCtc).toLocaleString()}
                          </td>
                          <td className="py-1.5 pr-3">
                            {r.revisionPercentage ? (
                              <span className="text-green-600 font-medium">
                                {Number(r.revisionPercentage)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                r.status === "Approved"
                                  ? "bg-green-100 text-green-700"
                                  : r.status === "Pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <TrendingUp className="size-3" /> No revision history found.
              </p>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Assign form — only shown when cycle hasn't started (no availability confirmed, no ratings) */}
      {cycleIsEditable ? (
        <FadeIn delay={0.1}>
          <AssignForm
            employeeId={employee.id}
            employeeName={toTitleCase(employee.name)}
            existingCycleId={existingCycle?.id ?? null}
            existingCycleType={existingCycle?.type ?? null}
            existingCycleIsManagerCycle={existingCycle?.isManagerCycle ?? false}
            existingAssignments={
              existingCycle?.assignments.map((a) => ({
                role: a.role,
                reviewerId: a.reviewerId,
              })) ?? []
            }
            autoType={autoType}
            autoReason={
              eligibility.eligible
                ? eligibility.reason
                : `Tenure: ${monthsTenure} months`
            }
            eligible={eligibility.eligible}
            hrUsers={hrUsers.map((u) => ({
              id: u.id,
              name: toTitleCase(u.name),
            }))}
            tlUsers={tlUsers.map((u) => ({
              id: u.id,
              name: toTitleCase(u.name),
            }))}
            mgrUsers={mgrUsers.map((u) => ({
              id: u.id,
              name: toTitleCase(u.name),
            }))}
            appraiseeId={employee.id}
            employeeRole={employee.role}
          />
        </FadeIn>
      ) : existingCycle ? (
        /* Dynamic progress timeline — replaces assign form once cycle is in progress */
        <FadeIn delay={0.1}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cycle Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {[
                {
                  done: true,
                  label: "Reviewers Assigned",
                  detail: existingCycle.assignments
                    .map((a) => `${a.role}: ${toTitleCase(a.reviewer.name)}`)
                    .join(", "),
                  icon: CheckCircle,
                  color: "text-green-500",
                },
                {
                  done: allAvailable,
                  label: "Reviewer Availability Confirmed",
                  detail: allAvailable
                    ? "All reviewers confirmed available"
                    : existingCycle.assignments.some(
                          (a) => a.availability === "NOT_AVAILABLE",
                        )
                      ? "Some reviewers unavailable — action required"
                      : "Waiting for reviewers to respond",
                  icon: allAvailable ? CheckCircle : Clock,
                  color: allAvailable
                    ? "text-green-500"
                    : existingCycle.assignments.some(
                          (a) => a.availability === "NOT_AVAILABLE",
                        )
                      ? "text-red-400"
                      : "text-amber-400",
                },
                {
                  done: selfSubmitted || selfDeadlinePassed,
                  label: "Self-Assessment",
                  detail: selfSubmitted
                    ? `Submitted ${existingCycle.self?.submittedAt ? new Date(existingCycle.self.submittedAt).toLocaleDateString("en-IN") : ""}`
                    : selfDeadlinePassed
                      ? "Deadline passed without submission"
                      : `Due ${existingCycle.self?.editableUntil.toLocaleDateString("en-IN")}`,
                  icon: selfSubmitted || selfDeadlinePassed ? FileCheck : Clock,
                  color: selfSubmitted
                    ? "text-green-500"
                    : selfDeadlinePassed
                      ? "text-red-400"
                      : "text-amber-400",
                },
                {
                  done: allRated,
                  label: "Reviewer Ratings",
                  detail: allRated
                    ? `All ${existingCycle.ratings.length} rating(s) submitted. Avg: ${(existingCycle.ratings.reduce((s, r) => s + r.averageScore, 0) / existingCycle.ratings.length).toFixed(2)}`
                    : `${existingCycle.ratings.length} / ${existingCycle.assignments.filter((a) => a.availability === "AVAILABLE").length} submitted`,
                  icon: allRated ? CheckCircle : Star,
                  color: allRated
                    ? "text-green-500"
                    : existingCycle.ratings.length > 0
                      ? "text-blue-500"
                      : "text-slate-400",
                },
                {
                  done: hasDecision,
                  label: "Management Decision",
                  detail: hasDecision
                    ? `Rating: ${existingCycle.decision!.finalRating.toFixed(2)} · Slab: ${existingCycle.decision!.slab?.label ?? "—"} · Increment: ₹${Number(existingCycle.decision!.finalAmount).toLocaleString("en-IN")}/yr`
                    : "Pending management review",
                  icon: hasDecision ? CheckCircle : Circle,
                  color: hasDecision ? "text-green-500" : "text-slate-300",
                },
                {
                  done: hasScheduledDate,
                  label: "Meeting Scheduled",
                  detail: hasScheduledDate
                    ? new Date(existingCycle.scheduledDate!).toLocaleDateString(
                        "en-IN",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )
                    : existingCycle.tentativeDate1 &&
                        existingCycle.tentativeDate2
                      ? "HR selecting final date from proposed options"
                      : "Tentative dates not yet proposed",
                  icon: hasScheduledDate ? CalendarCheck : Calendar,
                  color: hasScheduledDate ? "text-green-500" : "text-slate-300",
                },
                {
                  done: hasMom,
                  label: "MOM Recorded",
                  detail: hasMom
                    ? "Minutes of meeting recorded — cycle closed"
                    : meetingPassed
                      ? "Meeting passed — record MOM to finalize"
                      : "Awaiting meeting",
                  icon: hasMom ? CheckCircle : ClipboardList,
                  color: hasMom
                    ? "text-green-500"
                    : meetingPassed
                      ? "text-amber-500"
                      : "text-slate-300",
                  action:
                    meetingPassed && !hasMom
                      ? {
                          label: "Record MOM",
                          href: `/admin/mom/${existingCycle.id}`,
                        }
                      : hasMom
                        ? {
                            label: "View MOM",
                            href: `/admin/mom/${existingCycle.id}`,
                          }
                        : undefined,
                },
              ].map((step, i, arr) => {
                const Icon = step.icon;
                const isLast = i === arr.length - 1;
                return (
                  <div key={step.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <Icon
                        className={`size-5 shrink-0 mt-0.5 ${step.color}`}
                      />
                      {!isLast && (
                        <div className="w-px flex-1 bg-slate-100 dark:bg-slate-800 mt-1 mb-1" />
                      )}
                    </div>
                    <div className={`pb-4 flex-1 min-w-0 ${isLast ? "" : ""}`}>
                      <p
                        className={`text-sm font-semibold ${step.done ? "text-slate-900 dark:text-white" : "text-slate-400"}`}
                      >
                        {step.label}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${step.done ? "text-slate-500" : "text-slate-400"}`}
                      >
                        {step.detail}
                      </p>
                      {"action" in step && step.action && (
                        <Link
                          href={step.action.href}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/20 rounded px-2 py-0.5 border border-purple-200 dark:border-purple-800"
                        >
                          {step.action.label} →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        /* No cycle — show assign form to start one */
        <FadeIn delay={0.1}>
          <AssignForm
            employeeId={employee.id}
            employeeName={toTitleCase(employee.name)}
            existingCycleId={null}
            existingCycleType={null}
            existingCycleIsManagerCycle={false}
            existingAssignments={[]}
            autoType={autoType}
            autoReason={
              eligibility.eligible
                ? eligibility.reason
                : `Tenure: ${monthsTenure} months`
            }
            eligible={eligibility.eligible}
            hrUsers={hrUsers.map((u) => ({
              id: u.id,
              name: toTitleCase(u.name),
            }))}
            tlUsers={tlUsers.map((u) => ({
              id: u.id,
              name: toTitleCase(u.name),
            }))}
            mgrUsers={mgrUsers.map((u) => ({
              id: u.id,
              name: toTitleCase(u.name),
            }))}
            appraiseeId={employee.id}
            employeeRole={employee.role}
          />
        </FadeIn>
      )}

      {existingCycle?.self && (
        <FadeIn delay={0.2}>
          <DemoControls
            cycleId={existingCycle.id}
            editableUntil={existingCycle.self.editableUntil.toISOString()}
            submittedAt={existingCycle.self.submittedAt?.toISOString() ?? null}
          />
        </FadeIn>
      )}
    </div>
  );
}
