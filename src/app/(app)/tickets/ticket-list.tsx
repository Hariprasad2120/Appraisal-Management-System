"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { addTicketCommentAction } from "./actions";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

type Comment = {
  id: string;
  message: string;
  createdAt: Date;
  author: { name: string; role: string };
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  createdAt: Date;
  comments: Comment[];
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-500",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

function TicketCard({ ticket, currentUserId, isAdmin }: { ticket: Ticket; currentUserId: string; isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();

  function submitComment() {
    if (!reply.trim()) return;
    startTransition(async () => {
      const res = await addTicketCommentAction({ ticketId: ticket.id, message: reply.trim() });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Reply sent");
      setReply("");
    });
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>
                {ticket.priority}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[ticket.status] ?? ""}`}>
                {ticket.status.replace("_", " ")}
              </span>
              <span className="text-[10px] text-slate-400">{ticket.category}</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{ticket.title}</p>
            <p className="text-xs text-slate-400 mt-0.5" suppressHydrationWarning>{ticket.createdAt.toLocaleString()}</p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{ticket.description}</p>

            {ticket.comments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <MessageCircle className="size-3" /> Conversation
                </p>
                {ticket.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      c.author.role === "ADMIN"
                        ? "bg-[#00cec4]/10 border border-[#00cec4]/20"
                        : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs text-slate-700 dark:text-slate-300">{c.author.name}</span>
                      <span className={`text-[10px] px-1 rounded ${c.author.role === "ADMIN" ? "text-[#00cec4]" : "text-slate-400"}`}>
                        {c.author.role}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto" suppressHydrationWarning>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{c.message}</p>
                  </div>
                ))}
              </div>
            )}

            {ticket.status !== "CLOSED" && (
              <div className="space-y-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  placeholder="Add a reply or additional info..."
                  className="resize-none text-sm"
                />
                <Button size="sm" onClick={submitComment} disabled={pending || !reply.trim()}>
                  {pending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TicketList({ tickets, currentUserId, isAdmin }: { tickets: Ticket[]; currentUserId: string; isAdmin: boolean }) {
  if (tickets.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-slate-400 text-sm">
          No tickets yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} currentUserId={currentUserId} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
