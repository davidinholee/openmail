import { tool } from "ai";
import { z } from "zod";
import { searchMessages, getMessage, createDraft } from "@/lib/gmail";
import { getOrCreateSummary } from "./summarizer";

export function createSearchTools(accessToken: string, userId: string) {
  return {
    search_emails: tool({
      description:
        "Search the user's Gmail inbox using Gmail search syntax. " +
        "Supports operators: from:, to:, subject:, before:YYYY/MM/DD, after:YYYY/MM/DD, " +
        "has:attachment, is:unread, is:starred, label:, newer_than:Xd, older_than:Xd, " +
        "filename:, cc:, bcc:, in:anywhere. " +
        "Returns email metadata with AI-generated summaries.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("Gmail search query using Gmail search operators"),
        maxResults: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of results to return (default 10)"),
      }),
      execute: async ({ query, maxResults }) => {
        const results = await searchMessages(accessToken, query, maxResults);

        const withSummaries = await Promise.all(
          results.map(async (email) => {
            const summary = await getOrCreateSummary(userId, {
              messageId: email.messageId,
              threadId: email.threadId,
              subject: email.subject,
              sender: email.sender,
              date: email.date,
              snippet: email.snippet,
              labelIds: email.labelIds,
            });

            return {
              messageId: email.messageId,
              threadId: email.threadId,
              subject: email.subject,
              sender: email.sender,
              date: email.date,
              summary,
            };
          })
        );

        return withSummaries;
      },
    }),

    get_email_detail: tool({
      description:
        "Fetch the full body of a specific email when you need more detail " +
        "than the summary provides. Use sparingly.",
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
