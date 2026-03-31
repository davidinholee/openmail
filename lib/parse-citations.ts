import type { Citation } from "@/types/email";

export function parseCitations(content: string): {
  text: string;
  citations: Citation[];
} {
  const citations: Citation[] = [];

  const citationRegex =
    /^\[(\d+)\]\s+"([^"]+)"\s+—\s+(.+?),\s+(\d{4}-\d{2}-\d{2})\s+\(threadId:([^)]+)\)\s*$/gm;

  let match;
  while ((match = citationRegex.exec(content)) !== null) {
    citations.push({
      index: parseInt(match[1], 10),
      subject: match[2],
      sender: match[3].trim(),
      date: match[4],
      threadId: match[5].trim(),
      messageId: "",
      snippet: "",
    });
  }

  const text = content
    .replace(
      /^\[(\d+)\]\s+"[^"]+"\s+—\s+.+?,\s+\d{4}-\d{2}-\d{2}\s+\(threadId:[^)]+\)\s*$/gm,
      ""
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, citations };
}
