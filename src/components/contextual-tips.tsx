"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Lightbulb, X, ChevronRight, ChevronLeft } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";

type Tip = {
  title: string;
  body: string;
};

type TipSet = {
  match: (path: string, role: Role) => boolean;
  tips: Tip[];
};

const TIP_SETS: TipSet[] = [
  // Employee self-assessment
  {
    match: (p) => p.includes("/employee/self/"),
    tips: [
      {
        title: "Be honest and specific",
        body: "Reviewers compare your self-scores with their own observations. Scores that match reviewer perception carry more weight in the final decision.",
      },
      {
        title: "All reviewers must be available first",
        body: "The self-assessment window only opens after all assigned reviewers (HR, TL, Manager) confirm availability. If the form is locked, they haven't confirmed yet.",
      },
      {
        title: "Deadline is firm",
        body: "Once the editable window closes, your self-assessment is auto-locked regardless of submission status. Submit before the deadline shown on the page.",
      },
      {
        title: "Edit requests",
        body: "If you need more time, raise a support ticket or ask your reviewer to request an extension. Admins can re-open the window.",
      },
    ],
  },

  // Employee dashboard
  {
    match: (p, role) => p === "/employee" || (p.startsWith("/employee") && !p.includes("/self/")),
    tips: [
      {
        title: "How appraisal cycles work",
        body: "Each cycle goes through: Awaiting Availability → Self-Assessment → Reviewer Rating → Management Review → Decision. Your action is required at the Self-Assessment stage.",
      },
      {
        title: "Multiple cycles",
        body: "You may have more than one cycle (Interim, Annual, Special). Each is independent — complete them separately.",
      },
      {
        title: "History tab",
        body: "Completed cycles and their final decisions are visible in the History section.",
      },
    ],
  },

  // Reviewer availability
  {
    match: (p) => p.includes("/reviewer/") && p.includes("/availability"),
    tips: [
      {
        title: "Confirm availability early",
        body: "The employee's self-assessment window cannot open until ALL assigned reviewers confirm availability. Delays here delay the entire cycle.",
      },
      {
        title: "Not available?",
        body: "Selecting 'Not Available' notifies the admin to reassign. Use this only if you genuinely cannot conduct the review within the cycle window.",
      },
    ],
  },

  // Reviewer rating
  {
    match: (p) => p.includes("/reviewer/") && p.includes("/rate"),
    tips: [
      {
        title: "Rating opens after self-assessment deadline",
        body: "You can start rating only after the employee's self-assessment deadline passes, not when they submit. This ensures a fixed window.",
      },
      {
        title: "Scoring criteria",
        body: "Each category has a max score. Your total average across categories becomes the composite score visible to management.",
      },
      {
        title: "Post-comment",
        body: "After submitting your rating you can add a post-comment to flag concerns. This is visible to management only.",
      },
      {
        title: "Disagreement layer",
        body: "If you feel your submitted rating was inaccurate (over/under rated), use the Evaluation layer to flag it. This sets a ceiling for management's negotiation range.",
      },
    ],
  },

  // Reviewer dashboard
  {
    match: (p) => p === "/reviewer" || (p.startsWith("/reviewer") && !p.includes("/[cycleId]")),
    tips: [
      {
        title: "Your review queue",
        body: "This shows all cycles where you are assigned as a reviewer. Cycles you haven't rated yet appear first.",
      },
      {
        title: "Extension requests",
        body: "Employees can request deadline extensions. You can approve or reject these from within the cycle view.",
      },
    ],
  },

  // Management decide
  {
    match: (p) => p.includes("/management/decide/"),
    tips: [
      {
        title: "Scores are averaged",
        body: "Management sees the average of all reviewer scores. Individual reviewer scores are broken down below.",
      },
      {
        title: "Slab auto-suggestion",
        body: "The system suggests an increment slab based on the averaged rating. You can override it — provide a justification if deviating.",
      },
      {
        title: "Final amount",
        body: "Final increment amount is calculated from the slab percentage applied to the employee's current salary. Verify the salary is up to date before deciding.",
      },
      {
        title: "Disagreement ceilings",
        body: "If any reviewer flagged their rating as over/underrated, a negotiation ceiling is shown. Management cannot exceed this ceiling without explicit override.",
      },
    ],
  },

  // Management vote
  {
    match: (p) => p.includes("/management/vote/"),
    tips: [
      {
        title: "Date voting",
        body: "Vote for your preferred appraisal date from the two options provided. The most-voted date becomes the scheduled date.",
      },
      {
        title: "One vote per user",
        body: "You can change your vote before the admin locks the schedule. After locking, votes are final.",
      },
    ],
  },

  // Management dashboard
  {
    match: (p) => p === "/management" || p.startsWith("/management/salary"),
    tips: [
      {
        title: "Salary calculator",
        body: "Use the Salary Calculator to model CTC breakdowns before finalising increment decisions. Changes here do not auto-apply — you must save from the employee record.",
      },
      {
        title: "MOM",
        body: "After the appraisal meeting, record Minutes of Meeting (MOM) here. MOM is linked to the cycle and visible to HR for records.",
      },
    ],
  },

  // Admin employees
  {
    match: (p) => p.startsWith("/admin/employees") && !p.includes("/assign"),
    tips: [
      {
        title: "Creating a cycle",
        body: "Open an employee record and click 'New Cycle'. Choose cycle type (Interim / Annual / Special) and start date. Reviewers must be assigned before availability can be confirmed.",
      },
      {
        title: "Salary data",
        body: "Keep current salary up to date. Increment calculations during management review use the salary stored here.",
      },
    ],
  },

  // Admin assign reviewers
  {
    match: (p) => p.includes("/admin/employees/") && p.includes("/assign"),
    tips: [
      {
        title: "Required reviewer roles",
        body: "Each cycle needs HR, TL, and Manager assigned. All three must confirm availability before the self-assessment window opens.",
      },
      {
        title: "Reassignment",
        body: "If a reviewer marks 'Not Available', reassign them here. Notifications are sent automatically to the new reviewer.",
      },
    ],
  },

  // Admin MOM
  {
    match: (p) => p.startsWith("/admin/mom"),
    tips: [
      {
        title: "MOM purpose",
        body: "Minutes of Meeting documents the key discussion points from each appraisal review. It is attached to the cycle record for audit.",
      },
      {
        title: "Formatting",
        body: "Write clear, factual notes. Avoid subjective language. Include action items and decisions made.",
      },
    ],
  },

  // Admin notifications
  {
    match: (p) => p.startsWith("/admin/notifications"),
    tips: [
      {
        title: "Re-triggering notifications",
        body: "Mark a notification as Important first, then use the re-trigger button. This creates a new Urgent copy that persists on the recipient's screen until they explicitly acknowledge it.",
      },
      {
        title: "Audit trail",
        body: "Every notification ever sent is listed here — including who acknowledged it and when. Use filters to narrow by status.",
      },
      {
        title: "Ignored vs. dismissed",
        body: "'Dismissed' means the user clicked Close without reading the action. 'Acknowledged' means they confirmed they saw it. Urgent notifications require an explicit Acknowledge.",
      },
    ],
  },

  // Admin extensions
  {
    match: (p) => p.startsWith("/admin/extensions"),
    tips: [
      {
        title: "Extension window",
        body: "Approving an extension moves the self-assessment deadline forward. The new deadline is applied immediately.",
      },
      {
        title: "Reviewer extension",
        body: "Reviewers can also request extensions for their rating deadline. These appear here with a different type label.",
      },
    ],
  },

  // Tickets
  {
    match: (p) => p.startsWith("/tickets") || p.startsWith("/admin/tickets"),
    tips: [
      {
        title: "Ticket categories",
        body: "Use the correct category (Self-Assessment, Rating, Extension, General) so admin can route and prioritise tickets efficiently.",
      },
      {
        title: "Resolution SLA",
        body: "Tickets are typically responded to within 1 business day. Urgent cycle-blocking issues should be flagged as HIGH or URGENT priority.",
      },
    ],
  },
];

function getTips(pathname: string, role: Role): Tip[] {
  for (const set of TIP_SETS) {
    if (set.match(pathname, role)) return set.tips;
  }
  return [];
}

export function ContextualTips({ role }: { role: Role }) {
  const pathname = usePathname();
  const tips = getTips(pathname, role);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  if (tips.length === 0) return null;

  const tip = tips[idx];

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => { setOpen(true); setIdx(0); }}
        title="Workflow tips for this page"
        className="fixed bottom-4 right-4 z-[9998] size-10 rounded-full bg-[#008993] hover:bg-[#00cec4] shadow-lg flex items-center justify-center transition-colors group"
      >
        <Lightbulb className="size-4 text-white group-hover:scale-110 transition-transform" />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed bottom-16 right-4 z-[9998] w-[320px] max-w-[calc(100vw-2rem)] bg-[#0d1117]/96 border border-[#008993]/40 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
            style={{ backdropFilter: "blur(14px)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <Lightbulb className="size-4 text-[#00cec4] shrink-0" />
              <span className="text-sm font-semibold text-white flex-1">Workflow Tips</span>
              <span className="text-[11px] text-white/40">
                {idx + 1} / {tips.length}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-white/30 hover:text-white/70 ml-1 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
                className="px-4 py-4"
              >
                <p className="text-xs font-semibold text-[#00cec4] uppercase tracking-wider mb-1.5">
                  {tip.title}
                </p>
                <p className="text-sm text-white/80 leading-relaxed">{tip.body}</p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            {tips.length > 1 && (
              <div className="flex items-center justify-between px-4 pb-3 gap-2">
                <button
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  disabled={idx === 0}
                  className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="size-3.5" /> Prev
                </button>
                <div className="flex gap-1">
                  {tips.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className={[
                        "size-1.5 rounded-full transition-colors",
                        i === idx ? "bg-[#00cec4]" : "bg-white/20 hover:bg-white/40",
                      ].join(" ")}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setIdx((i) => Math.min(tips.length - 1, i + 1))}
                  disabled={idx === tips.length - 1}
                  className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
