import { tool } from "ai";
import { z } from "zod";
import { searchMessages, getMessage, createDraft, getMailboxInfo } from "@/lib/gmail";
import { db } from "@/lib/db";
import { cachedThreads } from "@/lib/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";

export function createSearchTools(accessToken: string, userId: string) {
  return {
    get_mailbox_info: tool({
      description:
        "Get message counts for Gmail labels (total and unread). " +
        "Call this FIRST to understand the scope of the user's mailbox before searching. " +
        "Common labels: INBOX, SENT, DRAFT, SPAM, TRASH, STARRED, UNREAD, IMPORTANT.",
      inputSchema: z.object({
        labels: z
          .array(z.string())
          .optional()
          .default(["INBOX", "UNREAD", "STARRED", "SENT"])
          .describe("Label IDs to check counts for"),
      }),
      execute: async ({ labels }) => {
        return await getMailboxInfo(accessToken, labels);
      },
    }),

    search_emails: tool({
      description:
        "Search the user's Gmail using Gmail search syntax. " +
        "Supports operators: from:, to:, subject:, before:YYYY/MM/DD, after:YYYY/MM/DD, " +
        "has:attachment, is:unread, is:starred, label:, newer_than:Xd, older_than:Xd, " +
        "filename:, cc:, bcc:, in:anywhere. " +
        "Returns email metadata with summaries, the total estimated result count, " +
        "and a nextPageToken if more results are available. " +
        "Use pageToken to fetch additional pages of results.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("Gmail search query using Gmail search operators"),
        maxResults: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum number of results per page (default 20)"),
        pageToken: z
          .string()
          .optional()
          .describe("Page token from a previous search to fetch more results"),
      }),
      execute: async ({ query, maxResults, pageToken }) => {
        // For simple text queries without Gmail operators, search cache first
        const hasGmailOperators = /\b(from|to|subject|before|after|has|is|label|newer_than|older_than|filename|cc|bcc|in):/.test(query);

        if (!hasGmailOperators && !pageToken) {
          const cached = await db
            .select()
            .from(cachedThreads)
            .where(
              and(
                eq(cachedThreads.userId, userId),
                or(
                  ilike(cachedThreads.subject, `%${query}%`),
                  ilike(cachedThreads.snippet, `%${query}%`),
                  ilike(cachedThreads.fromName, `%${query}%`),
                  ilike(cachedThreads.fromEmail, `%${query}%`)
                )
              )
            )
            .orderBy(desc(cachedThreads.lastMessageDate))
            .limit(maxResults);

          if (cached.length > 0) {
            return {
              emails: cached.map((row) => ({
                messageId: row.threadId, // thread-level result
                threadId: row.threadId,
                subject: row.subject || "(no subject)",
                sender: `${row.fromName || "Unknown"} <${row.fromEmail || ""}>`,
                date: row.lastMessageDate?.toISOString() || "",
                summary: row.summary || row.snippet || "",
              })),
              resultSizeEstimate: cached.length,
              nextPageToken: null,
              returnedCount: cached.length,
            };
          }
        }

        // Fall back to live Gmail search
        const response = await searchMessages(accessToken, query, maxResults, pageToken);

        return {
          emails: response.results.map((email) => ({
            messageId: email.messageId,
            threadId: email.threadId,
            subject: email.subject,
            sender: email.sender,
            date: email.date,
            summary: email.snippet,
          })),
          resultSizeEstimate: response.resultSizeEstimate,
          nextPageToken: response.nextPageToken || null,
          returnedCount: response.results.length,
        };
      },
    }),

    get_email_detail: tool({
      description:
        "Fetch the full body of a specific email when you need more detail " +
        "than the summary provides. Use sparingly — only when the summary is insufficient.",
      inputSchema: z.object({
        messageId: z.string().describe("The Gmail message ID to fetch"),
      }),
      execute: async ({ messageId }) => {
        const email = await getMessage(accessToken, messageId);
        return {
          messageId: email.id,
          threadId: email.threadId,
          subject: email.subject,
          sender: `${email.from.name} <${email.from.email}>`,
          recipients: email.to.map((a) => `${a.name} <${a.email}>`).join(", "),
          date: email.date,
          body: email.body.slice(0, 4000),
        };
      },
    }),
  };
}

export function createDraftTools(accessToken: string) {
  return {
    save_draft: tool({
      description:
        "Save an email draft to the user's Gmail account. " +
        "Only call this when the user explicitly confirms they want to save the draft.",
      inputSchema: z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Email body text"),
      }),
      execute: async ({ to, subject, body }) => {
        const draftId = await createDraft(accessToken, to, subject, body);
        return { success: true, draftId };
      },
    }),
  };
}
