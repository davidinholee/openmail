import { tool } from "ai";
import { z } from "zod";
import { searchMessages, getMessage, createDraft, getMailboxInfo, sendEmail, getThreadMessageIds } from "@/lib/gmail";
import { getOrCreateSummary } from "./summarizer";
import { db } from "@/lib/db";
import { cachedThreads, drafts } from "@/lib/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";

export function createAllTools(accessToken: string, userId: string) {
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
        try {
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
        } catch (err) {
          console.error("[get_email_detail] Failed for messageId:", messageId, err);
          return { error: `Failed to retrieve email ${messageId}. It may have been deleted or moved. Try searching again with different terms.` };
        }
      },
    }),

    save_draft: tool({
      description:
        "Save an email draft to the user's drafts. " +
        "Only call this when the user explicitly approves the draft (e.g., 'save it', 'looks good', 'yes'). " +
        "Returns a draftId that the user can edit later in the Drafts tab.",
      inputSchema: z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Email body text"),
        replyToThreadId: z.string().optional().describe("Gmail thread ID if this is a reply"),
      }),
      execute: async ({ to, subject, body, replyToThreadId }) => {
        const [draft] = await db
          .insert(drafts)
          .values({ userId, to, subject, body, replyToThreadId: replyToThreadId || null })
          .returning({ id: drafts.id });
        return { success: true, draftId: draft.id };
      },
    }),

    send_email: tool({
      description:
        "Send an email immediately via the user's Gmail account. " +
        "Only call this when the user explicitly asks to send (e.g., 'send it', 'send now'). " +
        "If replyToThreadId is provided, the email is sent as a reply within that thread.",
      inputSchema: z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Email body text"),
        cc: z.string().optional().describe("CC recipients"),
        bcc: z.string().optional().describe("BCC recipients"),
        replyToThreadId: z.string().optional().describe("Gmail thread ID if this is a reply"),
      }),
      execute: async ({ to, subject, body, cc, bcc, replyToThreadId }) => {
        if (/^Re:/i.test(subject) && !replyToThreadId) {
          return { success: false, error: "This looks like a reply (subject starts with 'Re:') but no replyToThreadId was provided. You must include replyToThreadId when sending replies." };
        }

        let threadId: string | undefined;
        let inReplyTo: string | undefined;
        let references: string | undefined;

        if (replyToThreadId) {
          threadId = replyToThreadId;
        }

        if (threadId) {
          try {
            const threadMsgs = await getThreadMessageIds(accessToken, threadId);
            if (threadMsgs.length > 0) {
              const lastMsg = threadMsgs[threadMsgs.length - 1];
              inReplyTo = lastMsg.headerMessageId;
              references = threadMsgs.map((m) => m.headerMessageId).filter(Boolean).join(" ");
            }
          } catch (e) {
            console.error("[send_email] Failed to fetch thread headers:", e);
          }
        }

        const gmailMessageId = await sendEmail(
          accessToken, to, subject, body, cc, bcc,
          threadId, inReplyTo, references
        );
        await db.insert(drafts).values({
          userId,
          to,
          subject,
          body,
          cc,
          bcc,
          replyToThreadId: replyToThreadId || null,
          status: "sent",
          sentAt: new Date(),
        });
        return { success: true, gmailMessageId };
      },
    }),
  };
}
