import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { emailSummaries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getOrCreateSummary(
  userId: string,
  email: {
    messageId: string;
    threadId: string;
    subject: string;
    sender: string;
    date: string;
    snippet: string;
    body?: string;
    labelIds?: string[];
    hasAttachments?: boolean;
  }
): Promise<string> {
  const existing = await db
    .select()
    .from(emailSummaries)
    .where(
      and(
        eq(emailSummaries.userId, userId),
        eq(emailSummaries.messageId, email.messageId)
      )
    )
    .limit(1);

  if (existing.length > 0 && existing[0].summary) {
    return existing[0].summary;
  }

  const contentForSummary = email.body || email.snippet;
  const summary = await generateEmailSummary(
    email.subject,
    email.sender,
    contentForSummary
  );

  await db
    .insert(emailSummaries)
    .values({
      userId,
      messageId: email.messageId,
      threadId: email.threadId,
      subject: email.subject,
      sender: email.sender,
      date: email.date ? new Date(email.date) : new Date(),
      summary,
      labels: email.labelIds || [],
      hasAttachments: email.hasAttachments || false,
    })
    .onConflictDoUpdate({
      target: [emailSummaries.userId, emailSummaries.messageId],
      set: { summary },
    });

  return summary;
}

async function generateEmailSummary(
  subject: string,
  sender: string,
  content: string
): Promise<string> {
  const truncatedContent = content.slice(0, 2000);

  const { text } = await generateText({
    model: openai("gpt-4.1-mini"),
    system:
      "Summarize this email in one concise sentence (max 30 words). Focus on the key action, request, or information. Do not include greetings or sign-offs in your summary.",
    prompt: `From: ${sender}\nSubject: ${subject}\n\n${truncatedContent}`,
    maxOutputTokens: 60,
  });

  return text.trim();
}

export async function batchSummarize(
  userId: string,
  emails: {
    messageId: string;
    threadId: string;
    subject: string;
    sender: string;
    date: string;
    snippet: string;
    body?: string;
    labelIds?: string[];
    hasAttachments?: boolean;
  }[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const batchSize = 5;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const summaries = await Promise.all(
      batch.map((email) => getOrCreateSummary(userId, email))
    );
    batch.forEach((email, idx) => {
      results.set(email.messageId, summaries[idx]);
    });
  }

  return results;
}
