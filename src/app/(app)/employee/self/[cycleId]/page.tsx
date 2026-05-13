import { notFound } from "next/navigation";
import Link from "next/link";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SelfForm } from "./self-form";
import { SUPPLEMENTARY_SECTIONS } from "@/lib/criteria";
import { getMergedCriteria } from "@/lib/criteria-overrides";
import { FadeIn } from "@/components/motion-div";
import { allReviewersAvailable } from "@/lib/workflow";
import { getSystemDate } from "@/lib/system-date";
import { Users, Lock, Clock, CheckCircle2, RotateCcw, ArrowLeft, CalendarDays } from "lucide-react";

export default async function SelfPage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { self: true, user: true, assignments: { select: { availability: true, role: true } } },
  });
  if (!cycle || cycle.userId !== session.user.id) notFound();
  if (!cycle.self) notFound();

  const allAvailable = allReviewersAvailable(cycle.assignments);
  const now = await getSystemDate();
  const deadlinePassed = now > cycle.self.editableUntil;
  const isLocked = cycle.self.locked || deadlinePassed;
  const editable = allAvailable && !isLocked;

  const existing = (cycle.self.answers as Record<string, { score: number; comment: string }>) ?? {};
  const mergedCategories = await getMergedCriteria();

  const selfStatus = cycle.self.status;
  const statusConfig = {
    DRAFT:      { label: "Draft",               color: "text-muted-foreground",                bg: "bg-muted border-border",                                                     icon: Clock },
    SUBMITTED:  { label: "Submitted",           color: "text-green-700 dark:text-green-400",   bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",   icon: CheckCircle2 },
    REOPENED:   { label: "Reopened & Edited",   color: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",   icon: RotateCcw },
    LOCKED:     { label: "Locked After Deadline", color: "text-red-700 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",           icon: Lock },
  } as const;

  const displayStatus = (isLocked && selfStatus !== "LOCKED") ? "LOCKED" : (selfStatus ?? "DRAFT");
  const cfg = statusConfig[displayStatus as keyof typeof statusConfig] ?? statusConfig.DRAFT;
  const StatusIcon = cfg.icon;

  return (
    <div className="w-full max-w-6xl space-y-5">
      <FadeIn>
        <Link
          href="/employee"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" /> Back to Dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Self-Assessment</h1>
          <p className="text-muted-foreground text-sm mt-1">{cycle.type} cycle</p>
        </div>
      </FadeIn>

      {/* Status + deadline */}
      <FadeIn delay={0.04}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 border ${cfg.bg}`}>
            <StatusIcon className={`size-4 shrink-0 ${cfg.color}`} />
            <div>
              <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
              {cycle.self.lastModifiedAt && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Last saved: {cycle.self.lastModifiedAt.toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>

          <div
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 border ${
              isLocked
                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                : "bg-muted/60 border-border"
            }`}
          >
            <CalendarDays
              className={`size-4 shrink-0 ${isLocked ? "text-red-500" : "text-muted-foreground"}`}
            />
            <div>
              <p
                className={`text-xs font-semibold ${
                  isLocked ? "text-red-700 dark:text-red-400" : "text-muted-foreground"
                }`}
              >
                {isLocked ? "Deadline passed" : "Editable until"}
              </p>
              <p
                className={`text-sm font-medium ${
                  isLocked ? "text-red-600 dark:text-red-400" : "text-foreground"
                }`}
              >
                {cycle.self.editableUntil.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Waiting for reviewers */}
      {!allAvailable && (
        <FadeIn delay={0.08}>
          <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Users className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-300 text-sm">
                    Waiting for reviewers
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Self-assessment opens once all assigned reviewers confirm availability.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {cycle.assignments.map((a) => (
                    <div key={a.role} className="flex items-center gap-2 text-xs">
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          a.availability === "AVAILABLE" ? "bg-green-500" : "bg-amber-400"
                        }`}
                      />
                      <span className="font-mono font-semibold text-muted-foreground w-16">{a.role}</span>
                      <span
                        className={`font-medium ${
                          a.availability === "AVAILABLE"
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {a.availability === "AVAILABLE"
                          ? "Available"
                          : a.availability === "NOT_AVAILABLE"
                          ? "Not Available"
                          : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {allAvailable && (
        <FadeIn delay={0.1}>
          <SelfForm
            cycleId={cycleId}
            categories={mergedCategories}
            supplementary={SUPPLEMENTARY_SECTIONS}
            existing={existing}
            editableUntil={cycle.self.editableUntil.toISOString()}
            submittedAt={cycle.self.submittedAt?.toISOString() ?? null}
            lastModifiedAt={cycle.self.lastModifiedAt?.toISOString() ?? null}
            editCount={cycle.self.editCount}
            selfStatus={displayStatus}
            editable={editable}
          />
        </FadeIn>
      )}
    </div>
  );
}
