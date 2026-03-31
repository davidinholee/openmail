import { auth } from "@/lib/auth";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { cachedThreads, syncState } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gmail = google.gmail({
    version: "v1",
    auth: (() => {
      const a = new google.auth.OAuth2();
      a.setCredentials({ access_token: session.accessToken });
      return a;
    })(),
  });

  // Just get profile — single fast API call
  const profile = await gmail.users.getProfile({ userId: "me" });

  // Count cached threads
  const cached = await db
    .select({ n: count() })
    .from(cachedThreads)
    .where(eq(cachedThreads.userId, session.user.id));

  // Get sync state
  const state = await db
    .select()
    .from(syncState)
    .where(eq(syncState.userId, session.user.id))
    .limit(1);

  return Response.json({
    gmail: {
      totalMessages: profile.data.messagesTotal,
      totalThreads: profile.data.threadsTotal,
    },
    cached: cached[0].n,
    syncState: state[0] || null,
  });
}
