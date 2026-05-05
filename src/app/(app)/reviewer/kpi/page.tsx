import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { monthStart } from "@/lib/kpi";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import { Button } from "@/components/ui/button";
import { approveKpiTaskAction, assignKpiTaskToEmployeeAction, rateKpiTaskAction } from "./actions";

function monthInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ReviewerKpiPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true },
  });
  if (!me || me.role !== "TL") {
    return (
      <div className="max-w-5xl rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Team KPI task assignment is available only for TL users.
      </div>
    );
  }
  const sp = await searchParams;
  const selectedMonth = sp.month ?? monthInput();
  const month = monthStart(selectedMonth);
  const reviews = await prisma.kpiReview.findMany({
    where: { month, user: { reportingManagerId: me.id } },
    orderBy: [{ user: { employeeNumber: "asc" } }, { user: { name: "asc" } }],
    include: {
      user: { select: { id: true, name: true, employeeNumber: true, reportingManagerId: true } },
      department: { select: { name: true } },
      items: { orderBy: [{ parentItemId: "asc" }, { sortOrder: "asc" }] },
    },
  });

  return (
    <div className="max-w-7xl space-y-5">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="ds-h1">Team KPI Ratings</h1>
            <p className="ds-body mt-1">Assign approved KPI tasks and rate employees reporting to you.</p>
          </div>
          <form className="flex items-end gap-2" action="/reviewer/kpi">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Month</span>
              <input name="month" type="month" defaultValue={selectedMonth} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
            </label>
            <Button type="submit" variant="outline">Load</Button>
          </form>
        </div>
      </FadeIn>

      <div className="space-y-5">
        {reviews.map((review) => {
          const criteria = review.items.filter((item) => item.itemKind === "CRITERION");
          return (
            <FadeIn key={review.id}>
              <section className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold">
                      {review.user.employeeNumber ? `${review.user.employeeNumber} - ` : ""}{toTitleCase(review.user.name)}
                    </h2>
                    <p className="text-xs text-muted-foreground">{review.status} - Average {review.averageRating.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{review.monthlyPointScore.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">{review.performanceCategory}</p>
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  {criteria.map((criterion) => {
                    const tasks = review.items.filter((item) => item.parentItemId === criterion.id && item.itemKind === "TASK");
                    return (
                      <div key={criterion.id} className="overflow-hidden rounded-lg border border-border">
                        <div className="border-b border-border bg-muted/30 px-4 py-3">
                          <p className="text-sm font-semibold">{criterion.name}</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[1050px] text-xs">
                            <thead className="text-left text-muted-foreground">
                              <tr>
                                <th className="px-4 py-2 font-medium">Task</th>
                                <th className="px-3 font-medium">Employee Status</th>
                                <th className="px-3 font-medium">Approval</th>
                                <th className="px-3 font-medium">Assigned</th>
                                <th className="px-3 font-medium">Rating</th>
                                <th className="px-3 font-medium">Remarks</th>
                                <th className="px-3 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {tasks.map((task) => (
                                <tr key={task.id}>
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-foreground">{task.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{task.description || task.target || task.measurement}</p>
                                  </td>
                                  <td className="px-3">{task.completionStatus.replaceAll("_", " ")}</td>
                                  <td className="px-3">{task.approvalStatus}</td>
                                  <td className="px-3">{task.assignedToEmployee ? "Yes" : "No"}</td>
                                  <td className="px-3">{task.rating?.toFixed(2) ?? "-"}</td>
                                  <td className="px-3 text-muted-foreground">{task.remarks ?? "-"}</td>
                                  <td className="px-3">
                                    <div className="flex flex-wrap gap-2">
                                      <form action={approveKpiTaskAction} className="flex gap-2">
                                        <input type="hidden" name="itemId" value={task.id} />
                                        <select name="approvalStatus" defaultValue={task.approvalStatus === "DISAPPROVED" ? "DISAPPROVED" : "APPROVED"} disabled={review.status === "FINALIZED"} className="h-8 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-60">
                                          <option value="APPROVED">Approve</option>
                                          <option value="DISAPPROVED">Disapprove</option>
                                        </select>
                                        <input name="approvalRemarks" defaultValue={task.approvalRemarks ?? ""} placeholder="Approval note" disabled={review.status === "FINALIZED"} className="h-8 w-32 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-60" />
                                        <Button type="submit" size="sm" variant="outline" disabled={review.status === "FINALIZED"}>Save</Button>
                                      </form>
                                      <form action={assignKpiTaskToEmployeeAction} className="flex gap-2">
                                        <input type="hidden" name="itemId" value={task.id} />
                                        <select name="assignedToEmployee" defaultValue={String(task.assignedToEmployee)} disabled={review.status === "FINALIZED" || task.approvalStatus !== "APPROVED"} className="h-8 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-60">
                                          <option value="true">Assign</option>
                                          <option value="false">Unassign</option>
                                        </select>
                                        <Button type="submit" size="sm" variant="outline" disabled={review.status === "FINALIZED" || task.approvalStatus !== "APPROVED"}>Apply</Button>
                                      </form>
                                      <form action={rateKpiTaskAction} className="flex gap-2">
                                        <input type="hidden" name="itemId" value={task.id} />
                                        <input name="rating" type="number" min="1" max="5" step="0.01" defaultValue={task.rating ?? ""} placeholder="Rating" disabled={review.status === "FINALIZED" || task.approvalStatus !== "APPROVED" || !task.assignedToEmployee} className="h-8 w-20 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-60" />
                                        <input name="remarks" defaultValue={task.remarks ?? ""} placeholder="Rating note" disabled={review.status === "FINALIZED" || task.approvalStatus !== "APPROVED" || !task.assignedToEmployee} className="h-8 w-32 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-60" />
                                        <Button type="submit" size="sm" disabled={review.status === "FINALIZED" || task.approvalStatus !== "APPROVED" || !task.assignedToEmployee}>Rate</Button>
                                      </form>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </FadeIn>
          );
        })}
        {reviews.length === 0 && (
          <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            No KPI drafts found for this department and month.
          </div>
        )}
      </div>
    </div>
  );
}
