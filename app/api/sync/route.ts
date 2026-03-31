import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchMessages, getMessage } from "@/lib/gmail";
import { getOrCreateSummary } from "@/lib/ai/summarizer";
import { db } from "@/lib/db";
import { emailSummaries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await searchMessages(
      session.accessToken,
      "newer_than:30d",
      100
    );

    let processed = 0;
    let skipped = 0;
    const batchSize = 5;

    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (email) => {
          const existing = await db
            .select({ id: emailSummaries.id })
            .from(emailSummaries)
            .where(
              and(
                eq(emailSummaries.userId, session.user!.id),
                eq(emailSummaries.messageId, email.messageId)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            return;
          }

          try {
            const fullMessage = await getMessage(
              session.accessToken!,
              email.messageId
            );

            await getOrCreateSummary(session.user!.id, {
              messageId: email.messageId,
              threadId: email.threadId,
              subject: email.subject,
              sender: email.sender,
              date: email.date,
              snippet: email.snippet,
              body: fullMessage.body,
              labelIds: email.labelIds,
              hasAttachments: false,
            });

            processed++;
          } catch (err) {
            console.error(`Failed to summarize ${email.messageId}:`, err);
          }
        })
      );
    }

    return NextResponse.json({
      total: results.length,
      processed,
      skipped,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
