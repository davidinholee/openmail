import { google } from "googleapis";
import type {
  ParsedEmail,
  EmailThread,
  EmailLabel,
  ThreadListResponse,
  EmailAddress,
  EmailAttachment,
} from "@/types/email";
import { parseEmailBody, extractAddresses } from "./gmail-parser";

function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

export async function listThreads(
  accessToken: string,
  options: {
    query?: string;
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<ThreadListResponse> {
  const gmail = getGmailClient(accessToken);
  const { maxResults = 25, query, labelIds, pageToken } = options;

  const res = await gmail.users.threads.list({
    userId: "me",
    maxResults,
    q: query,
    labelIds,
    pageToken,
  });

  const threadIds = res.data.threads || [];

  const threads = await Promise.all(
    threadIds.map(async (t) => {
      const thread = await gmail.users.threads.get({
        userId: "me",
        id: t.id!,
        format: "metadata",
        metadataHeaders: [
          "Subject",
          "From",
          "To",
          "Cc",
          "Date",
          "Content-Type",
        ],
      });

      const msgs = thread.data.messages || [];
      const lastMsg = msgs[msgs.length - 1];
      const firstMsg = msgs[0];

      const getHeader = (
        headers: { name?: string | null; value?: string | null }[] | null | undefined,
        name: string
      ) => headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

      const firstHeaders = firstMsg?.payload?.headers;
      const lastHeaders = lastMsg?.payload?.headers;

      const allLabelIds = [
        ...new Set(msgs.flatMap((m) => m.labelIds || [])),
      ];
      const isUnread = allLabelIds.includes("UNREAD");
      const isStarred = allLabelIds.includes("STARRED");
      const hasAttachments = msgs.some((m) =>
        m.payload?.parts?.some(
          (p) => p.filename && p.filename.length > 0
        )
      );

      return {
        id: thread.data.id!,
        historyId: thread.data.historyId!,
        messages: [],
        snippet: lastMsg?.snippet || "",
        subject: getHeader(firstHeaders, "Subject") || "(no subject)",
        from: extractAddresses(getHeader(lastHeaders, "From"))[0] || {
          name: "Unknown",
          email: "",
        },
        lastMessageDate: getHeader(lastHeaders, "Date"),
        messageCount: msgs.length,
        isUnread,
        isStarred,
        labelIds: allLabelIds,
        hasAttachments,
      } satisfies EmailThread;
    })
  );

  return {
    threads,
    nextPageToken: res.data.nextPageToken || undefined,
    resultSizeEstimate: res.data.resultSizeEstimate || 0,
  };
}

export async function getThread(
  accessToken: string,
  threadId: string
): Promise<EmailThread> {
  const gmail = getGmailClient(accessToken);

  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  const msgs = res.data.messages || [];
  const parsedMessages = msgs.map((msg) => parseMessage(msg));

  const firstMsg = parsedMessages[0];
  const lastMsg = parsedMessages[parsedMessages.length - 1];
  const allLabelIds = [
    ...new Set(parsedMessages.flatMap((m) => m.labelIds)),
  ];

  return {
    id: res.data.id!,
    historyId: res.data.historyId!,
    messages: parsedMessages,
    snippet: lastMsg?.snippet || "",
    subject: firstMsg?.subject || "(no subject)",
    from: lastMsg?.from || { name: "Unknown", email: "" },
    lastMessageDate: lastMsg?.date || "",
    messageCount: parsedMessages.length,
    isUnread: allLabelIds.includes("UNREAD"),
    isStarred: allLabelIds.includes("STARRED"),
    labelIds: allLabelIds,
    hasAttachments: parsedMessages.some((m) => m.attachments.length > 0),
  };
}

export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<ParsedEmail> {
  const gmail = getGmailClient(accessToken);

  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return parseMessage(res.data);
}

export async function searchMessages(
  accessToken: string,
  query: string,
  maxResults = 10
): Promise<
  {
    messageId: string;
    threadId: string;
    subject: string;
    sender: string;
    date: string;
    snippet: string;
    labelIds: string[];
  }[]
> {
  const gmail = getGmailClient(accessToken);

  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messageIds = res.data.messages || [];

  return Promise.all(
    messageIds.map(async (m) => {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const headers = msg.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value || "";

      return {
        messageId: msg.data.id!,
        threadId: msg.data.threadId!,
        subject: getHeader("Subject") || "(no subject)",
        sender: getHeader("From"),
        date: getHeader("Date"),
        snippet: msg.data.snippet || "",
        labelIds: msg.data.labelIds || [],
      };
    })
  );
}

export async function createDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const gmail = getGmailClient(accessToken);

  const rawMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: { raw: encodedMessage },
    },
  });

  return res.data.id!;
}

export async function modifyMessage(
  accessToken: string,
  messageId: string,
  options: { addLabelIds?: string[]; removeLabelIds?: string[] }
) {
  const gmail = getGmailClient(accessToken);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: options.addLabelIds,
      removeLabelIds: options.removeLabelIds,
    },
  });
}

export async function listLabels(
  accessToken: string
): Promise<EmailLabel[]> {
  const gmail = getGmailClient(accessToken);

  const res = await gmail.users.labels.list({ userId: "me" });

  return (res.data.labels || []).map((label) => ({
    id: label.id!,
    name: label.name!,
    type: label.type === "system" ? "system" : "user",
    messagesTotal: label.messagesTotal ?? undefined,
    messagesUnread: label.messagesUnread ?? undefined,
    color: label.color
      ? {
          textColor: label.color.textColor || "",
          backgroundColor: label.color.backgroundColor || "",
        }
      : undefined,
  }));
}

// ─── Internal helpers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMessage(msg: any): ParsedEmail {
  const headers: { name?: string; value?: string }[] = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    "";

  const fromAddresses = extractAddresses(getHeader("From"));
  const toAddresses = extractAddresses(getHeader("To"));
  const ccAddresses = extractAddresses(getHeader("Cc"));

  const { text, html } = parseEmailBody(msg.payload);
  const attachments = extractAttachments(msg.payload?.parts);
  const labelIds = msg.labelIds || [];

  return {
    id: msg.id || "",
    threadId: msg.threadId || "",
    subject: getHeader("Subject") || "(no subject)",
    from: fromAddresses[0] || { name: "Unknown", email: "" },
    to: toAddresses,
    cc: ccAddresses,
    date: getHeader("Date"),
    snippet: msg.snippet || "",
    body: text,
    bodyHtml: html,
    labelIds,
    isUnread: labelIds.includes("UNREAD"),
    isStarred: labelIds.includes("STARRED"),
    attachments,
  };
}

function extractAttachments(
  parts: unknown[] | null | undefined
): EmailAttachment[] {
  if (!parts) return [];

  const attachments: EmailAttachment[] = [];

  for (const part of parts as {
    filename?: string;
    mimeType?: string;
    body?: { size?: number; attachmentId?: string };
    parts?: unknown[];
  }[]) {
    if (part.filename && part.filename.length > 0) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
        size: part.body?.size || 0,
        attachmentId: part.body?.attachmentId || "",
      });
    }
    if (part.parts) {
      attachments.push(...extractAttachments(part.parts));
    }
  }

  return attachments;
}
