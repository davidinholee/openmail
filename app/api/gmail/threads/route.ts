import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cachedThreads } from "@/lib/db/schema";
import { eq, and, lt, desc, sql, or, ilike } from "drizzle-orm";
import type { EmailThread, ThreadListResponse } from "@/types/email";

const PAGE_SIZE = 25;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || undefined;
  const labelIds = searchParams.get("labelIds")?.split(",") || undefined;
  const priority = searchParams.get("priority") === "true";
  const pageToken = searchParams.get("pageToken") || undefined;

  try {
    const conditions = [eq(cachedThreads.userId, session.user.id)];

    // Label filtering
    if (labelIds && labelIds.length > 0) {
      conditions.push(
        sql`${cachedThreads.labelIds} @> ARRAY[${sql.join(
          labelIds.map((l) => sql`${l}`),
          sql`, `
        )}]::text[]`
      );
    }

    // Priority filtering
    if (priority) {
      conditions.push(eq(cachedThreads.isPriority, true));
    }

    // Text search
    if (query) {
      conditions.push(
        or(
          ilike(cachedThreads.subject, `%${query}%`),
          ilike(cachedThreads.snippet, `%${query}%`),
          ilike(cachedThreads.fromName, `%${query}%`),
          ilike(cachedThreads.fromEmail, `%${query}%`)
        )!
      );
    }

    // Cursor pagination
    if (pageToken) {
      const cursorDate = new Date(pageToken);
      if (!isNaN(cursorDate.getTime())) {
        conditions.push(lt(cachedThreads.lastMessageDate, cursorDate));
      }
    }

    const rows = await db
      .select()
      .from(cachedThreads)
      .where(and(...conditions))
      .orderBy(desc(cachedThreads.lastMessageDate))
      .limit(PAGE_SIZE + 1); // Fetch one extra to detect if there's a next page

    const hasMore = rows.length > PAGE_SIZE;
    const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    const threads: EmailThread[] = pageRows.map((row) => ({
      id: row.threadId,
      historyId: row.historyId || "",
      messages: [],
      snippet: row.snippet || "",
      subject: row.subject || "(no subject)",
      from: { name: row.fromName || "Unknown", email: row.fromEmail || "" },
      lastMessageDate: row.lastMessageDate?.toISOString() || "",
      messageCount: row.messageCount || 1,
      isUnread: row.isUnread || false,
      isStarred: row.isStarred || false,
      labelIds: row.labelIds || [],
      hasAttachments: row.hasAttachments || false,
    }));

    const nextPageToken = hasMore
      ? pageRows[pageRows.length - 1].lastMessageDate?.toISOString()
      : undefined;

    const response: ThreadListResponse = {
      threads,
      nextPageToken,
      resultSizeEstimate: threads.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Threads list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
