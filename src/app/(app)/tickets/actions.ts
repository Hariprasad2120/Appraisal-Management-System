"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  category: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

const commentSchema = z.object({
  ticketId: z.string(),
  message: z.string().min(1),
});

type Result = { ok: true } | { ok: false; error: string };

export async function createTicketAction(input: z.infer<typeof createSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const ticket = await prisma.ticket.create({
    data: {
      raisedById: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      priority: parsed.data.priority,
    },
  });

  // Notify all admins
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", active: true } });
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: "TICKET_CREATED",
        message: `New ${parsed.data.priority} priority ticket: "${parsed.data.title}" from ${session.user.name ?? "a user"}`,
        link: `/admin/tickets`,
        persistent: true,
        critical: false,
      },
    });
  }

  revalidatePath("/tickets");
  revalidatePath("/admin/tickets");
  return { ok: true };
}

export async function addTicketCommentAction(input: z.infer<typeof commentSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const ticket = await prisma.ticket.findUnique({ where: { id: parsed.data.ticketId } });
  if (!ticket) return { ok: false, error: "Ticket not found" };

  // Only ticket raiser or admin can comment
  const isAdmin = session.user.role === "ADMIN" || session.user.secondaryRole === "ADMIN";
  if (ticket.raisedById !== session.user.id && !isAdmin) {
    return { ok: false, error: "Forbidden" };
  }

  await prisma.ticketComment.create({
    data: {
      ticketId: parsed.data.ticketId,
      authorId: session.user.id,
      message: parsed.data.message,
    },
  });

  // Notify the other party
  const notifyUserId = isAdmin ? ticket.raisedById : null;
  if (notifyUserId) {
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: "TICKET_COMMENT",
        message: `Admin replied to your ticket: "${ticket.title}"`,
        link: `/tickets`,
        persistent: true,
        critical: false,
      },
    });
  }

  revalidatePath("/tickets");
  revalidatePath("/admin/tickets");
  return { ok: true };
}
