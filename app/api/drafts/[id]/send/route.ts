import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { drafts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail, getThreadMessageIds } from "@/lib/gmail";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [draft] = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, id), eq(drafts.userId, session.user.id)));

  if (!draft) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (draft.status === "sent") {
    return Response.json({ error: "Already sent" }, { status: 400 });
  }

  if (!draft.to) {
    return Response.json({ error: "No recipient specified" }, { status: 400 });
  }

  if (/^Re:/i.test(draft.subject) && !draft.replyToThreadId) {
    return Response.json(
      { error: "This looks like a reply but has no thread attached. Please create it as a reply from the original thread." },
      { status: 400 }
    );
  }

  let threadId: string | undefined;
  let inReplyTo: string | undefined;
  let references: string | undefined;

  if (draft.replyToThreadId) {
    threadId = draft.replyToThreadId;
  }

  if (threadId) {
    try {
      const threadMsgs = await getThreadMessageIds(session.accessToken, threadId);
      if (threadMsgs.length > 0) {
        const lastMsg = threadMsgs[threadMsgs.length - 1];
        inReplyTo = lastMsg.headerMessageId;
        references = threadMsgs
          .map((m) => m.headerMessageId)
          .filter(Boolean)
          .join(" ");
      }
    } catch (e) {
      console.error("[send] Failed to fetch thread headers:", e);
    }
  }

  const gmailMessageId = await sendEmail(
    session.accessToken,
    draft.to,
    draft.subject,
    draft.body,
    draft.cc || undefined,
    draft.bcc || undefined,
    threadId,
    inReplyTo,
    references
  );

  await db
    .update(drafts)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(drafts.id, id));

  return Response.json({ success: true, gmailMessageId });
}
