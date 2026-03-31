import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { cachedThreads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getOrCreateSummary(
  userId: string,
  threadId: string,
  content: { subject: string; sender: string; body: string }
): Promise<string> {
  // Check if summary already exists in cache
  const existing = await db
    .select({ summary: cachedThreads.summary })
    .from(cachedThreads)
    .where(
      and(
        eq(cachedThreads.userId, userId),
        eq(cachedThreads.threadId, threadId)
      )
    )
    .limit(1);

  if (existing.length > 0 && existing[0].summary) {
    return existing[0].summary;
  }

  // Generate summary
  const summary = await generateEmailSummary(
    content.subject,
    content.sender,
    content.body
  );

  // Store in cache
  await db
    .update(cachedThreads)
    .set({ summary })
    .where(
      and(
        eq(cachedThreads.userId, userId),
        eq(cachedThreads.threadId, threadId)
      )
    );

  return summary;
}

async function generateEmailSummary(
  subject: string,
  sender: string,
  content: string
): Promise<string> {
  const truncatedContent = content.slice(0, 2000);

  const { text } = await generateText({
    model: openai("gpt-5.1-mini"),
    system:
      "Summarize this email in one concise sentence (max 30 words). Focus on the key action, request, or information. Do not include greetings or sign-offs in your summary.",
    prompt: `From: ${sender}\nSubject: ${subject}\n\n${truncatedContent}`,
    maxOutputTokens: 60,
  });

  return text.trim();
}
