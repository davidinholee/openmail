import { streamText, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages as messagesTable, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSearchTools, createDraftTools } from "@/lib/ai/tools";
import { SEARCH_SYSTEM_PROMPT } from "@/lib/ai/search-agent";
import { DRAFT_SYSTEM_PROMPT } from "@/lib/ai/draft-agent";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { conversationId, messages } = await req.json();

  const lastUserMessage = messages[messages.length - 1]?.content || "";
  const isDrafting =
    /\b(draft|compose|write|send)\b.*\b(email|message|reply)\b/i.test(
      lastUserMessage
    ) ||
    /\b(email|message|reply)\b.*\b(to|for|about)\b/i.test(lastUserMessage);

  const systemPrompt = isDrafting
    ? DRAFT_SYSTEM_PROMPT
    : SEARCH_SYSTEM_PROMPT;

  const tools = isDrafting
    ? createDraftTools(session.accessToken)
    : createSearchTools(session.accessToken, session.user.id);

  if (conversationId) {
    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: lastUserMessage,
    });

    if (messages.length <= 1) {
      const title =
        lastUserMessage.slice(0, 80) + (lastUserMessage.length > 80 ? "..." : "");
      await db
        .update(conversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages,
    tools,
    stopWhen: stepCountIs(4),
    onFinish: async ({ text }) => {
      if (conversationId && text) {
        await db.insert(messagesTable).values({
          conversationId,
          role: "assistant",
          content: text,
        });

        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }
    },
  });

  return result.toTextStreamResponse();
}
