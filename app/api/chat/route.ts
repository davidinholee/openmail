import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages as messagesTable, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAllTools } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/search-agent";

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

    const tools = createAllTools(session.accessToken, session.user.id);
    const systemPrompt = buildSystemPrompt({
      name: session.user.name,
      email: session.user.email,
    });

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

    console.log("[chat] Calling OpenAI with model gpt-5.1, isDrafting:", isDrafting);
    console.log("[chat] User message:", lastUserMessage.slice(0, 200));

    let stepCount = 0;
    let totalTokens = 0;

    const result = streamText({
      model: openai("gpt-5.1"),
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(12),
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta" && chunk.text) {
          process.stdout.write(chunk.text);
        }
      },
      onError: ({ error }) => {
        console.error("[chat] Stream error:", error);
      },
      onStepFinish: (event) => {
        stepCount++;
        const e = event as Record<string, unknown>;
        const stepTokens = (e.usage as { totalTokens?: number })?.totalTokens || 0;
        totalTokens += stepTokens;

        console.log("\n[chat] ─── Step", stepCount, "───");
        console.log("[chat]   finishReason:", e.finishReason, "| tokens:", stepTokens);

        const toolCalls = e.toolCalls as { toolName: string; input: unknown }[] | undefined;
        if (toolCalls && toolCalls.length > 0) {
          for (const tc of toolCalls) {
            console.log("[chat]   tool call:", tc.toolName, JSON.stringify(tc.input).slice(0, 300));
          }
        }

        const toolResults = e.toolResults as { toolName: string; output: unknown }[] | undefined;
        if (toolResults && toolResults.length > 0) {
          for (const tr of toolResults) {
            const resultStr = JSON.stringify(tr.output);
            console.log(
              "[chat]   tool result:", tr.toolName,
              "→", resultStr.slice(0, 500) + (resultStr.length > 500 ? "..." : "")
            );
          }
        }

        const text = e.text as string | undefined;
        if (text) {
          console.log("[chat]   text:", text.slice(0, 200) + (text.length > 200 ? "..." : ""));
        }
      },
      onFinish: async ({ text }) => {
        console.log("\n[chat] ═══ Finished ═══");
        console.log("[chat]   total steps:", stepCount, "| total tokens:", totalTokens);
        console.log("[chat]   final text length:", text?.length || 0);

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
