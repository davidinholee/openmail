import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { count } from "drizzle-orm";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  const session = await auth();
  checks.auth = session?.user
    ? { ok: true, detail: `Signed in as ${session.user.email}` }
    : { ok: false, detail: "Not authenticated — sign in first" };

  checks.accessToken = session?.accessToken
    ? { ok: true, detail: `Token present (${session.accessToken.slice(0, 12)}...)` }
    : { ok: false, detail: "No Gmail access token — re-authenticate" };

  checks.openaiKey = process.env.OPENAI_API_KEY
    ? { ok: true, detail: `Key set (${process.env.OPENAI_API_KEY.slice(0, 8)}...)` }
    : { ok: false, detail: "OPENAI_API_KEY not set in .env.local" };

  try {
    const result = await db.select({ n: count() }).from(users);
    checks.database = { ok: true, detail: `Connected — ${result[0].n} user(s) in DB` };
  } catch (e) {
    checks.database = {
      ok: false,
      detail: `DB error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (checks.openaiKey.ok) {
    try {
      const { text } = await generateText({
        model: openai("gpt-5.1-mini"),
        prompt: "Say 'ok' and nothing else.",
        maxOutputTokens: 5,
      });
      checks.openaiApi = { ok: true, detail: `Response: "${text}"` };
    } catch (e) {
      checks.openaiApi = {
        ok: false,
        detail: `OpenAI API error: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  } else {
    checks.openaiApi = { ok: false, detail: "Skipped — no API key" };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return Response.json({ status: allOk ? "all_ok" : "issues_found", checks }, { status: 200 });
}
