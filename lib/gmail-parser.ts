import type { EmailAddress } from "@/types/email";

export function extractAddresses(headerValue: string): EmailAddress[] {
  if (!headerValue) return [];

  return headerValue.split(",").map((addr) => {
    const trimmed = addr.trim();
    const match = trimmed.match(/^"?(.+?)"?\s*<(.+?)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: trimmed, email: trimmed };
  });
}

interface PayloadPart {
  mimeType?: string | null;
  body?: { data?: string | null; size?: number } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts?: any[] | null;
}

export function parseEmailBody(
  payload: PayloadPart | null | undefined
): { text: string; html: string } {
  if (!payload) return { text: "", html: "" };

  let text = "";
  let html = "";

  function walk(part: PayloadPart) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text += decodeBase64Url(part.body.data);
    }
    if (part.mimeType === "text/html" && part.body?.data) {
      html += decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      for (const sub of part.parts) {
        walk(sub);
      }
    }
  }

  walk(payload);

  if (!text && !html && payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  if (!text && html) {
    text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  return { text, html };
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}
