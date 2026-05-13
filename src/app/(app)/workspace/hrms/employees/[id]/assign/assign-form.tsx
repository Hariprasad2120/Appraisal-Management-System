"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { assignReviewersAction, startSpecialAppraisalAction } from "./actions";
import { Users, CheckCircle, Zap, Info } from "lucide-react";

type Opt = { id: string; name: string };

type Props = {
  employeeId: string;
  employeeName: string;
  existingCycleId: string | null;
  existingCycleType: string | null;
  existingCycleIsManagerCycle: boolean;
  existingAssignments: { role: string; reviewerId: string }[];
  autoType: string;
  autoReason: string;
  eligible: boolean;
  hrUsers: Opt[];
  tlUsers: Opt[];
  mgrUsers: Opt[];
  appraiseeId: string;
  employeeRole: string;
};

export function AssignForm(props: Props) {
  const { appraiseeId } = props;

  // Role-based reviewer rules:
  // - HR appraisee: HR only
  // - MANAGER appraisee: HR only
  // - TL appraisee: HR + Manager (no TL reviewer)
  // - Others: HR + optional TL + optional Manager (toggles)
  const isHrAppraisee = props.employeeRole === "HR";
  const isManagerAppraisee = props.employeeRole === "MANAGER";
  const isTlAppraisee = props.employeeRole === "TL";

  const initial = (role: string) =>
    props.existingAssignments.find((a) => a.role === role)?.reviewerId ?? "";

  const [hr, setHr] = useState(initial("HR"));
  const [tl, setTl] = useState(initial("TL"));
  const [mgr, setMgr] = useState(initial("MANAGER"));

  const initialIncludeTL = Boolean(initial("TL"));
  const initialIncludeManager = Boolean(initial("MANAGER"));
  const [includeTL, setIncludeTL] = useState(isHrAppraisee || isManagerAppraisee || isTlAppraisee ? false : initialIncludeTL);
  const [includeManager, setIncludeManager] = useState(isHrAppraisee || isManagerAppraisee ? false : (isTlAppraisee ? true : initialIncludeManager));
  const [pending, startTransition] = useTransition();

  // Special appraisal state
  const [specialHr, setSpecialHr] = useState("");
  const [specialTl, setSpecialTl] = useState("");
  const [specialMgr, setSpecialMgr] = useState("");
  const [specialIncludeTL, setSpecialIncludeTL] = useState(isHrAppraisee || isManagerAppraisee || isTlAppraisee ? false : true);
  const [specialIncludeManager, setSpecialIncludeManager] = useState(isHrAppraisee || isManagerAppraisee ? false : true);
  const [specialPending, startSpecialTransition] = useTransition();

  const hasActive = !!props.existingCycleId;
  const allSet =
    (isHrAppraisee || isManagerAppraisee)
      ? Boolean(hr)
      : isTlAppraisee
      ? Boolean(hr && mgr)
      : Boolean(hr && (!includeTL || tl) && (!includeManager || mgr));

  const specialAllSet =
    (isHrAppraisee || isManagerAppraisee)
      ? Boolean(specialHr)
      : isTlAppraisee
      ? Boolean(specialHr && specialMgr)
      : Boolean(specialHr && (!specialIncludeTL || specialTl) && (!specialIncludeManager || specialMgr));

  function submit() {
    if (!hr) { toast.error("HR reviewer required"); return; }
    if (isTlAppraisee && !mgr) { toast.error("Manager reviewer required for TL appraisee"); return; }
    if (!isHrAppraisee && !isManagerAppraisee && includeTL && !tl) { toast.error("TL reviewer required (toggle enabled)"); return; }
    if (!isHrAppraisee && !isManagerAppraisee && includeManager && !mgr) { toast.error("Manager reviewer required (toggle enabled)"); return; }
    startTransition(async () => {
      const res = await assignReviewersAction({
        employeeId: props.employeeId,
        hrId: hr,
        tlId: includeTL ? tl : undefined,
        mgrId: (isTlAppraisee || includeManager) ? mgr : undefined,
        includeTlReviewer: includeTL,
        includeManagerReviewer: isTlAppraisee ? true : includeManager,
      });
      if (res.ok) toast.success("Reviewers assigned", { description: "Notifications have been sent." });
      else toast.error(res.error ?? "Failed");
    });
  }

  function submitSpecial() {
    if (!specialHr) { toast.error("HR reviewer required"); return; }
    if (isTlAppraisee && !specialMgr) { toast.error("Manager reviewer required for TL appraisee"); return; }
    if (!isHrAppraisee && !isManagerAppraisee && specialIncludeTL && !specialTl) { toast.error("TL reviewer required (toggle enabled)"); return; }
    if (!isHrAppraisee && !isManagerAppraisee && specialIncludeManager && !specialMgr) { toast.error("Manager reviewer required (toggle enabled)"); return; }
    startSpecialTransition(async () => {
      const res = await startSpecialAppraisalAction({
        employeeId: props.employeeId,
        hrId: specialHr,
        tlId: specialIncludeTL ? specialTl : undefined,
        mgrId: (isTlAppraisee || specialIncludeManager) ? specialMgr : undefined,
        includeTlReviewer: specialIncludeTL,
        includeManagerReviewer: isTlAppraisee ? true : specialIncludeManager,
      });
      if (res.ok) toast.success("Special appraisal started", { description: "Notifications have been sent." });
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="space-y-4">
      {/* Standard cycle — assign reviewers */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            {hasActive ? "Update Reviewer Assignments" : "Assign Reviewers"}
          </CardTitle>

          {/* Eligibility pill */}
          <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 mt-1 ${
            props.eligible
              ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
              : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500"
          }`}>
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <div>
              {hasActive ? (
                <span>Active cycle: <strong>{props.existingCycleType}</strong> — updating assignments</span>
              ) : props.eligible ? (
                <span>System determined: <strong>{props.autoType} Appraisal</strong> — {props.autoReason}</span>
              ) : (
                <span>No milestone due this month. You can still assign — type auto-set to <strong>{props.autoType}</strong> based on tenure.</span>
              )}
            </div>
          </div>

          {hasActive && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mt-1">
              Reassigning a reviewer resets their availability to PENDING.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Reviewer toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Toggle
              label="Include TL Reviewer"
              description={isTlAppraisee ? "Not allowed for TL appraisee" : isHrAppraisee || isManagerAppraisee ? "Not applicable for this role" : "Adds TL as an assigned reviewer"}
              checked={includeTL}
              disabled={isHrAppraisee || isManagerAppraisee || isTlAppraisee}
              onChange={setIncludeTL}
            />
            <Toggle
              label="Include Manager Reviewer"
              description={isHrAppraisee || isManagerAppraisee ? "Not applicable for this role" : isTlAppraisee ? "Required for TL appraisee" : "Adds Manager as an assigned reviewer"}
              checked={includeManager}
              disabled={isHrAppraisee || isManagerAppraisee || isTlAppraisee}
              onChange={setIncludeManager}
            />
          </div>

          <div className={`grid grid-cols-1 gap-4 ${isHrAppraisee || isManagerAppraisee ? "sm:grid-cols-1" : isTlAppraisee ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            <ReviewerPicker label="HR Reviewer" color="bg-green-500" value={hr} onChange={setHr} options={props.hrUsers} appraiseeId={appraiseeId} />
            {!isHrAppraisee && !isManagerAppraisee && !isTlAppraisee && includeTL && (
              <ReviewerPicker label="TL Reviewer" color="bg-amber-500" value={tl} onChange={setTl} options={props.tlUsers} appraiseeId={appraiseeId} />
            )}
            {!isHrAppraisee && !isManagerAppraisee && (isTlAppraisee || includeManager) && (
              <ReviewerPicker label="Manager Reviewer" color="bg-blue-500" value={mgr} onChange={setMgr} options={props.mgrUsers} appraiseeId={appraiseeId} />
            )}
          </div>

          {(isHrAppraisee || isManagerAppraisee) && (
            <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2">
              {props.employeeRole} appraisee: HR reviewer only. After HR submits, it moves to Management Review.
            </p>
          )}
          {isTlAppraisee && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              TL appraisee: reviewed by HR + Manager only (no TL reviewer).
            </p>
          )}

          {allSet && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
              <span className="flex items-center gap-1"><CheckCircle className="size-3 text-green-500" /> HR: {props.hrUsers.find((u) => u.id === hr)?.name}</span>
              {!isHrAppraisee && !isManagerAppraisee && !isTlAppraisee && includeTL && tl && (
                <span className="flex items-center gap-1"><CheckCircle className="size-3 text-amber-500" /> TL: {props.tlUsers.find((u) => u.id === tl)?.name}</span>
              )}
              {!isHrAppraisee && !isManagerAppraisee && (isTlAppraisee || includeManager) && mgr && (
                <span className="flex items-center gap-1"><CheckCircle className="size-3 text-blue-500" /> MGR: {props.mgrUsers.find((u) => u.id === mgr)?.name}</span>
              )}
            </div>
          )}

          <Button onClick={submit} disabled={pending || !allSet} className="h-10">
            {pending ? "Saving..." : hasActive ? "Update Assignments" : "Assign Reviewers"}
          </Button>
        </CardContent>
      </Card>

      {/* Special appraisal — only when no active cycle */}
      {!hasActive && (
        <Card className="border-0 shadow-sm border-l-4 border-l-purple-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Zap className="size-4" />
              Start Special Appraisal
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin-only. Outside normal milestone schedule. Creates a SPECIAL cycle immediately.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle
                label="Include TL Reviewer"
                description={isTlAppraisee ? "Not allowed for TL appraisee" : isHrAppraisee || isManagerAppraisee ? "Not applicable for this role" : "Adds TL as an assigned reviewer"}
                checked={specialIncludeTL}
                disabled={isHrAppraisee || isManagerAppraisee || isTlAppraisee}
                onChange={setSpecialIncludeTL}
              />
              <Toggle
                label="Include Manager Reviewer"
                description={isHrAppraisee || isManagerAppraisee ? "Not applicable for this role" : isTlAppraisee ? "Required for TL appraisee" : "Adds Manager as an assigned reviewer"}
                checked={specialIncludeManager}
                disabled={isHrAppraisee || isManagerAppraisee || isTlAppraisee}
                onChange={setSpecialIncludeManager}
              />
            </div>

            <div className={`grid grid-cols-1 gap-4 ${isHrAppraisee || isManagerAppraisee ? "sm:grid-cols-1" : isTlAppraisee ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              <ReviewerPicker label="HR Reviewer" color="bg-green-500" value={specialHr} onChange={setSpecialHr} options={props.hrUsers} appraiseeId={appraiseeId} />
              {!isHrAppraisee && !isManagerAppraisee && !isTlAppraisee && specialIncludeTL && (
                <ReviewerPicker label="TL Reviewer" color="bg-amber-500" value={specialTl} onChange={setSpecialTl} options={props.tlUsers} appraiseeId={appraiseeId} />
              )}
              {!isHrAppraisee && !isManagerAppraisee && (isTlAppraisee || specialIncludeManager) && (
                <ReviewerPicker label="Manager Reviewer" color="bg-blue-500" value={specialMgr} onChange={setSpecialMgr} options={props.mgrUsers} appraiseeId={appraiseeId} />
              )}
            </div>

            {specialAllSet && (
              <div className="flex flex-wrap gap-3 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                <span className="flex items-center gap-1"><CheckCircle className="size-3 text-green-500" /> HR: {props.hrUsers.find((u) => u.id === specialHr)?.name}</span>
                {!isHrAppraisee && !isManagerAppraisee && !isTlAppraisee && specialIncludeTL && specialTl && (
                  <span className="flex items-center gap-1"><CheckCircle className="size-3 text-amber-500" /> TL: {props.tlUsers.find((u) => u.id === specialTl)?.name}</span>
                )}
                {!isHrAppraisee && !isManagerAppraisee && (isTlAppraisee || specialIncludeManager) && specialMgr && (
                  <span className="flex items-center gap-1"><CheckCircle className="size-3 text-blue-500" /> MGR: {props.mgrUsers.find((u) => u.id === specialMgr)?.name}</span>
                )}
              </div>
            )}

            <Button
              onClick={submitSpecial}
              disabled={specialPending || !specialAllSet}
              className="h-10 bg-purple-600 hover:bg-purple-700"
            >
              {specialPending ? "Starting..." : "Start Special Appraisal"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card px-3 py-2 ${disabled ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground">{label}</div>
          {description && (
            <div className="text-[10px] text-muted-foreground mt-0.5">{description}</div>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          aria-label={label}
        >
          <span className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
        </button>
      </div>
    </div>
  );
}

function ReviewerPicker({ label, color, value, onChange, options, appraiseeId }: {
  label: string; color: string; value: string; onChange: (v: string) => void; options: Opt[]; appraiseeId: string;
}) {
  const selectedName = options.find((o) => o.id === value)?.name;
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full inline-block ${color}`} />
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full">
          {selectedName ? (
            <span>{selectedName}</span>
          ) : (
            <SelectValue placeholder={`Select ${label}`} />
          )}
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 && (
            <SelectItem value="__none__" disabled>No users found</SelectItem>
          )}
          {options.map((o) => {
            const isSelf = o.id === appraiseeId;
            return (
              <SelectItem key={o.id} value={o.id} disabled={isSelf} className={isSelf ? "opacity-40" : undefined}>
                {o.name}{isSelf ? " (appraisee)" : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
