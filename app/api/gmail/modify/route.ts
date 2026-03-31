import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { modifyMessage } from "@/lib/gmail";
import { db } from "@/lib/db";
import { cachedThreads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId, threadId, addLabelIds, removeLabelIds } = await req.json();

  if (!messageId) {
    return NextResponse.json(
      { error: "Missing messageId" },
      { status: 400 }
    );
  }

  try {
    await modifyMessage(session.accessToken, messageId, {
      addLabelIds,
      removeLabelIds,
    });

    // Write-through: update cache if threadId provided
    if (threadId) {
      // Only delete from cache if trashed (permanently gone)
      if (addLabelIds?.includes("TRASH")) {
        await db
          .delete(cachedThreads)
          .where(
            and(
              eq(cachedThreads.userId, session.user.id),
              eq(cachedThreads.threadId, threadId)
            )
          );
      } else {
        // Read current labelIds to update them
        const current = await db
          .select({ labelIds: cachedThreads.labelIds })
          .from(cachedThreads)
          .where(
            and(
              eq(cachedThreads.userId, session.user.id),
              eq(cachedThreads.threadId, threadId)
            )
          )
          .limit(1);

        const currentLabels = new Set(current[0]?.labelIds || []);
        for (const label of addLabelIds || []) currentLabels.add(label);
        for (const label of removeLabelIds || []) currentLabels.delete(label);

        const updates: Record<string, unknown> = {
          updatedAt: new Date(),
          labelIds: [...currentLabels],
        };

        if (addLabelIds?.includes("STARRED")) updates.isStarred = true;
        if (removeLabelIds?.includes("STARRED")) updates.isStarred = false;
        if (addLabelIds?.includes("UNREAD")) updates.isUnread = true;
        if (removeLabelIds?.includes("UNREAD")) updates.isUnread = false;

        await db
          .update(cachedThreads)
          .set(updates)
          .where(
            and(
              eq(cachedThreads.userId, session.user.id),
              eq(cachedThreads.threadId, threadId)
            )
          );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gmail modify error:", error);
    return NextResponse.json(
      { error: "Failed to modify message" },
      { status: 500 }
    );
  }
}
