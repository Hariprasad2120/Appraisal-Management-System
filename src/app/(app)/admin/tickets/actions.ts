"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

export async function updateTicketStatusAction(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return { ok: false, error: "Forbidden" };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, error: "Ticket not found" };

  await prisma.ticket.update({ where: { id: ticketId }, data: { status } });

  await prisma.notification.create({
    data: {
      userId: ticket.raisedById,
      type: "TICKET_STATUS",
      message: `Your ticket "${ticket.title}" status updated to: ${status.replace("_", " ")}`,
      link: `/tickets`,
      persistent: status === "RESOLVED" || status === "CLOSED",
    },
  });

  revalidatePath("/admin/tickets");
  revalidatePath("/tickets");
  return { ok: true };
}

const commentSchema = z.object({
  ticketId: z.string(),
  message: z.string().min(1),
});

export async function adminAddCommentAction(input: z.infer<typeof commentSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const ticket = await prisma.ticket.findUnique({ where: { id: parsed.data.ticketId } });
  if (!ticket) return { ok: false, error: "Not found" };

  await prisma.ticketComment.create({
    data: {
      ticketId: parsed.data.ticketId,
      authorId: session.user.id,
      message: parsed.data.message,
    },
  });

  await prisma.notification.create({
    data: {
      userId: ticket.raisedById,
      type: "TICKET_COMMENT",
      message: `Admin replied to your ticket: "${ticket.title}"`,
      link: `/tickets`,
      persistent: true,
      critical: false,
    },
  });

  revalidatePath("/admin/tickets");
  return { ok: true };
}
