"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTicketStatusAction, adminAddCommentAction } from "./actions";
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
  raisedBy: { name: string; role: string; department: string | null };
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

const PRIORITY_ORDER = ["URGENT", "HIGH", "MEDIUM", "LOW"];

function AdminTicketCard({ ticket }: { ticket: Ticket }) {
  const [expanded, setExpanded] = useState(ticket.status === "OPEN" && ticket.priority === "URGENT");
  const [reply, setReply] = useState("");
  const [statusPending, startStatusTransition] = useTransition();
  const [commentPending, startCommentTransition] = useTransition();

  function updateStatus(status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED") {
    startStatusTransition(async () => {
      const res = await updateTicketStatusAction(ticket.id, status);
      if (!res.ok) toast.error(res.error);
      else toast.success(`Status updated to ${status}`);
    });
  }

  function submitComment() {
    if (!reply.trim()) return;
    startCommentTransition(async () => {
      const res = await adminAddCommentAction({ ticketId: ticket.id, message: reply.trim() });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Reply sent to user");
      setReply("");
    });
  }

  return (
    <Card className={`border-0 shadow-sm ${ticket.priority === "URGENT" ? "border-l-4 border-l-red-500" : ticket.priority === "HIGH" ? "border-l-4 border-l-orange-400" : ""}`}>
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
            <p className="text-xs text-slate-400 mt-0.5">
              {ticket.raisedBy.name} · {ticket.raisedBy.role}
              {ticket.raisedBy.department ? ` · ${ticket.raisedBy.department}` : ""}
              {" · "}<span suppressHydrationWarning>{ticket.createdAt.toLocaleString()}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={ticket.status}
              onValueChange={(v) => updateStatus(v as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED")}
              disabled={statusPending}
            >
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{ticket.description}</p>

            {ticket.comments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <MessageCircle className="size-3" /> Conversation ({ticket.comments.length})
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
                  placeholder="Reply to user..."
                  className="resize-none text-sm"
                />
                <Button size="sm" onClick={submitComment} disabled={commentPending || !reply.trim()}>
                  {commentPending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminTicketPanel({ tickets }: { tickets: Ticket[] }) {
  const [filter, setFilter] = useState<string>("ALL");

  const sorted = [...tickets].sort((a, b) => {
    const pa = PRIORITY_ORDER.indexOf(a.priority);
    const pb = PRIORITY_ORDER.indexOf(b.priority);
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filtered = filter === "ALL" ? sorted : sorted.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => {
          const count = s === "ALL" ? tickets.length : tickets.filter((t) => t.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-[#00cec4] text-black"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {s.replace("_", " ")} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center text-slate-400 text-sm">
            No tickets in this category.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <AdminTicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}
