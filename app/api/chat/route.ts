import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages as messagesTable, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSearchTools, createDraftTools } from "@/lib/ai/tools";
import { SEARCH_SYSTEM_PROMPT } from "@/lib/ai/search-agent";
import { DRAFT_SYSTEM_PROMPT } from "@/lib/ai/draft-agent";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — please sign in again" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
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
      try {
        await db.insert(messagesTable).values({
          conversationId,
          role: "user",
          content: lastUserMessage,
        });

        if (messages.length <= 1) {
          const title =
            lastUserMessage.slice(0, 80) +
            (lastUserMessage.length > 80 ? "..." : "");
          await db
            .update(conversations)
            .set({ title, updatedAt: new Date() })
            .where(eq(conversations.id, conversationId));
        }
      } catch (dbError) {
        console.error("[chat] DB error persisting user message:", dbError);
      }
    }

    console.log("[chat] Calling OpenAI with model gpt-4.1, isDrafting:", isDrafting);

    const result = streamText({
      model: openai("gpt-4.1"),
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(4),
      onFinish: async ({ text }) => {
        console.log("[chat] Stream finished, text length:", text?.length || 0);
        if (conversationId && text) {
          try {
            await db.insert(messagesTable).values({
              conversationId,
              role: "assistant",
              content: text,
            });
            await db
              .update(conversations)
              .set({ updatedAt: new Date() })
              .where(eq(conversations.id, conversationId));
          } catch (dbError) {
            console.error("[chat] DB error persisting assistant message:", dbError);
          }
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[chat] Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
