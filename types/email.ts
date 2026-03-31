export interface EmailHeader {
  name: string;
  value: string;
}

export interface EmailAddress {
  name: string;
  email: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface ParsedEmail {
  id: string;
  threadId: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  date: string;
  snippet: string;
  body: string;
  bodyHtml: string;
  labelIds: string[];
  isUnread: boolean;
  isStarred: boolean;
  attachments: EmailAttachment[];
}

export interface EmailThread {
  id: string;
  historyId: string;
  messages: ParsedEmail[];
  snippet: string;
  subject: string;
  from: EmailAddress;
  lastMessageDate: string;
  messageCount: number;
  isUnread: boolean;
  isStarred: boolean;
  labelIds: string[];
  hasAttachments: boolean;
}

export interface EmailLabel {
  id: string;
  name: string;
  type: "system" | "user";
  messagesTotal?: number;
  messagesUnread?: number;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface ThreadListResponse {
  threads: EmailThread[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface EmailSummary {
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  recipients: string;
  date: string;
  summary: string;
  labels: string[];
  hasAttachments: boolean;
}

export interface Citation {
  index: number;
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}
