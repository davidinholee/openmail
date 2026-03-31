import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, conversations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const [msg] = await db.select().from(messages).where(eq(messages.id, id));
  if (!msg) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.id, msg.conversationId), eq(conversations.userId, session.user.id))
    );
  if (!conv) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .update(messages)
    .set({ draft: body.draft })
    .where(eq(messages.id, id));

  return Response.json({ success: true });
}
