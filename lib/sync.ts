import { google } from "googleapis";
import { db } from "@/lib/db";
import { syncState, cachedThreads } from "@/lib/db/schema";
import { eq, and, notInArray, inArray, sql, lt } from "drizzle-orm";
import { listHistory, getProfile } from "@/lib/gmail";
import { extractAddresses } from "@/lib/gmail-parser";
import type { EmailThread } from "@/types/email";

export interface SyncResult {
  type: "full" | "incremental" | "skipped";
  threadsUpdated: number;
  threadsRemoved: number;
  complete: boolean;
  progress?: {
    threadsProcessed: number;
    pagesProcessed: number;
  };
}

const SYNC_LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (full syncs can be long)
const BATCH_CONCURRENCY = 10; // max concurrent Gmail API calls
const BATCH_DELAY_MS = 100; // pause between batches to avoid rate limits
const FULL_SYNC_PAGES_PER_CHUNK = 20; // ~2000 threads per request
const UPSERT_BATCH_SIZE = 50; // bulk SQL insert batch size

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run an async function over items in batches with concurrency control and delays */
async function batchProcess<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = BATCH_CONCURRENCY,
  delayMs = BATCH_DELAY_MS
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fn));

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    // Pause between batches (skip after the last one)
    if (i + concurrency < items.length) {
      await sleep(delayMs);
    }
  }

  return results;
}

/** Fetch a single thread's metadata from Gmail (lightweight — metadata format only) */
async function fetchThreadMetadata(
  gmail: ReturnType<typeof google.gmail>,
  threadId: string
): Promise<EmailThread | null> {
  try {
    const thread = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "To", "Cc", "Date", "Content-Type"],
    });

    const msgs = thread.data.messages || [];
    if (msgs.length === 0) return null;

    const lastMsg = msgs[msgs.length - 1];
    const firstMsg = msgs[0];

    const getHeader = (
      headers:
        | { name?: string | null; value?: string | null }[]
        | null
        | undefined,
      name: string
    ) =>
      headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value || "";

    const firstHeaders = firstMsg?.payload?.headers;
    const lastHeaders = lastMsg?.payload?.headers;

    const allLabelIds = [
      ...new Set(msgs.flatMap((m) => m.labelIds || [])),
    ];

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
      isUnread: allLabelIds.includes("UNREAD"),
      isStarred: allLabelIds.includes("STARRED"),
      labelIds: allLabelIds,
      hasAttachments: msgs.some((m) =>
        m.payload?.parts?.some((p) => p.filename && p.filename.length > 0)
      ),
    };
  } catch {
    return null;
  }
}

// ─── Main sync entry point ──────────────────────────────────────────────────

export async function performSync(
  userId: string,
  accessToken: string,
  forceFullSync = false
): Promise<SyncResult> {
  console.log(`[sync] performSync called for user ${userId}, forceFullSync=${forceFullSync}`);

  const state = await db
    .select()
    .from(syncState)
    .where(eq(syncState.userId, userId))
    .limit(1);

  const current = state[0];
  console.log(`[sync] Current sync state:`, JSON.stringify(current));

  // Check if there's an in-progress full sync to resume
  const hasResumableCursor = !!current?.fullSyncCursor;

  // Check for concurrent sync (with staleness timeout) — but allow resumable syncs through
  if (current?.syncStatus === "syncing" && !hasResumableCursor) {
    const elapsed = Date.now() - (current.updatedAt?.getTime() || 0);
    console.log(`[sync] Sync lock active, elapsed: ${elapsed}ms, timeout: ${SYNC_LOCK_TIMEOUT_MS}ms`);
    if (elapsed < SYNC_LOCK_TIMEOUT_MS) {
      console.log(`[sync] Skipping — another sync is in progress`);
      return { type: "skipped", threadsUpdated: 0, threadsRemoved: 0, complete: true };
    }
  }

  // Upsert sync state to "syncing"
  await db
    .insert(syncState)
    .values({ userId, syncStatus: "syncing", updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [syncState.userId],
      set: { syncStatus: "syncing", updatedAt: new Date() },
    });

  try {
    let result: SyncResult;

    if (forceFullSync || !current?.historyId || hasResumableCursor) {
      result = await performFullSync(userId, accessToken);
    } else {
      try {
        result = await performIncrementalSync(
          userId,
          accessToken,
          current.historyId
        );
      } catch (err: unknown) {
        const isExpired =
          err instanceof Error &&
          (err.message.includes("404") ||
            err.message.includes("Start history id"));
        if (isExpired) {
          result = await performFullSync(userId, accessToken);
        } else {
          throw err;
        }
      }
    }

    if (result.complete) {
      await db
        .update(syncState)
        .set({ syncStatus: "idle", updatedAt: new Date() })
        .where(eq(syncState.userId, userId));
    }

    return result;
  } catch (err) {
    await db
      .update(syncState)
      .set({ syncStatus: "error", updatedAt: new Date() })
      .where(eq(syncState.userId, userId));
    throw err;
  }
}

// ─── Full sync ──────────────────────────────────────────────────────────────

async function performFullSync(
  userId: string,
  accessToken: string
): Promise<SyncResult> {
  const gmail = getGmailClient(accessToken);

  // Load saved cursor (resume point) from DB
  const stateRows = await db
    .select({ fullSyncCursor: syncState.fullSyncCursor })
    .from(syncState)
    .where(eq(syncState.userId, userId))
    .limit(1);

  let pageToken: string | undefined = stateRows[0]?.fullSyncCursor || undefined;
  const isResuming = !!pageToken;

  console.log(
    `[sync] Full sync ${isResuming ? "RESUMING" : "STARTING"}, cursor: ${pageToken || "none"}`
  );

  // Record sync start time on first chunk (used for orphan cleanup on final chunk)
  if (!isResuming) {
    await db
      .update(syncState)
      .set({ fullSyncStartedAt: new Date() })
      .where(eq(syncState.userId, userId));
  }

  // Paginate thread IDs for this chunk
  const chunkThreadIds: string[] = [];
  let pagesThisChunk = 0;

  do {
    const res = await gmail.users.threads.list({
      userId: "me",
      maxResults: 100,
      pageToken,
    });

    const threads = res.data.threads || [];
    for (const t of threads) {
      if (t.id) chunkThreadIds.push(t.id);
    }

    pageToken = res.data.nextPageToken || undefined;
    pagesThisChunk++;

    console.log(
      `[sync] Page ${pagesThisChunk}: ${threads.length} threads, total this chunk: ${chunkThreadIds.length}, hasMore: ${!!pageToken}`
    );

    if (pageToken) await sleep(50);
  } while (pageToken && pagesThisChunk < FULL_SYNC_PAGES_PER_CHUNK);

  // Fetch metadata for this chunk's threads
  const allThreads = await batchProcess(
    chunkThreadIds,
    (threadId) => fetchThreadMetadata(gmail, threadId)
  );

  const validThreads = allThreads.filter(
    (t): t is EmailThread => t !== null
  );

  console.log(
    `[sync] Chunk metadata: ${validThreads.length} valid / ${chunkThreadIds.length} total`
  );

  // Upsert this chunk
  const threadsUpdated = await upsertThreadsToCache(userId, validThreads);

  // More pages remain — save cursor, return incomplete
  if (pageToken) {
    await db
      .update(syncState)
      .set({
        fullSyncCursor: pageToken,
        updatedAt: new Date(),
      })
      .where(eq(syncState.userId, userId));

    return {
      type: "full",
      threadsUpdated,
      threadsRemoved: 0,
      complete: false,
      progress: {
        threadsProcessed: chunkThreadIds.length,
        pagesProcessed: pagesThisChunk,
      },
    };
  }

  // Final chunk — clean up orphans (threads not touched during this full sync)
  console.log(`[sync] Final chunk — cleaning up orphans`);

  const syncStartRows = await db
    .select({ fullSyncStartedAt: syncState.fullSyncStartedAt })
    .from(syncState)
    .where(eq(syncState.userId, userId))
    .limit(1);

  let threadsRemoved = 0;
  const syncStart = syncStartRows[0]?.fullSyncStartedAt;

  if (syncStart) {
    const deleted = await db
      .delete(cachedThreads)
      .where(
        and(
          eq(cachedThreads.userId, userId),
          lt(cachedThreads.updatedAt, syncStart)
        )
      )
      .returning({ id: cachedThreads.id });
    threadsRemoved = deleted.length;
    console.log(`[sync] Removed ${threadsRemoved} orphan threads`);
  }

  // Clear cursor and save historyId
  const profile = await getProfile(accessToken);

  await db
    .update(syncState)
    .set({
      fullSyncCursor: null,
      fullSyncStartedAt: null,
      historyId: profile.historyId,
      lastFullSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(syncState.userId, userId));

  return {
    type: "full",
    threadsUpdated,
    threadsRemoved,
    complete: true,
    progress: {
      threadsProcessed: chunkThreadIds.length,
      pagesProcessed: pagesThisChunk,
    },
  };
}

// ─── Incremental sync ───────────────────────────────────────────────────────

async function performIncrementalSync(
  userId: string,
  accessToken: string,
  startHistoryId: string
): Promise<SyncResult> {
  const gmail = getGmailClient(accessToken);

  const { history, historyId: newHistoryId } = await listHistory(
    accessToken,
    startHistoryId
  );

  // Collect unique thread IDs that need updating vs checking
  const threadIdsToUpdate = new Set<string>();
  const threadIdsToCheck = new Set<string>();

  for (const msg of history.messagesAdded) threadIdsToUpdate.add(msg.threadId);
  for (const msg of history.labelsAdded) threadIdsToUpdate.add(msg.threadId);
  for (const msg of history.labelsRemoved) threadIdsToUpdate.add(msg.threadId);
  for (const msg of history.messagesDeleted) threadIdsToCheck.add(msg.threadId);

  // Threads that were also updated don't need a separate existence check
  for (const id of threadIdsToUpdate) threadIdsToCheck.delete(id);

  let threadsUpdated = 0;
  let threadsRemoved = 0;

  // Re-fetch and upsert updated threads (rate-limited)
  if (threadIdsToUpdate.size > 0) {
    const results = await batchProcess(
      [...threadIdsToUpdate],
      (threadId) => fetchThreadMetadata(gmail, threadId)
    );

    const threads = results.filter((t): t is EmailThread => t !== null);
    const fetchedIds = new Set(threads.map((t) => t.id));
    const toRemove = [...threadIdsToUpdate].filter((id) => !fetchedIds.has(id));

    if (threads.length > 0) {
      threadsUpdated = await upsertThreadsToCache(userId, threads);
    }
    if (toRemove.length > 0) {
      await removeThreadsFromCache(userId, toRemove);
      threadsRemoved += toRemove.length;
    }
  }

  // Check if deleted threads still exist (rate-limited)
  if (threadIdsToCheck.size > 0) {
    const results = await batchProcess(
      [...threadIdsToCheck],
      (threadId) => fetchThreadMetadata(gmail, threadId)
    );

    const stillExist = new Set(
      results.filter((t): t is EmailThread => t !== null).map((t) => t.id)
    );
    const toRemove = [...threadIdsToCheck].filter((id) => !stillExist.has(id));

    // Upsert threads that still exist (they may have changed)
    const threadsToUpdate = results.filter(
      (t): t is EmailThread => t !== null
    );
    if (threadsToUpdate.length > 0) {
      threadsUpdated += await upsertThreadsToCache(userId, threadsToUpdate);
    }

    if (toRemove.length > 0) {
      await removeThreadsFromCache(userId, toRemove);
      threadsRemoved += toRemove.length;
    }
  }

  await db
    .update(syncState)
    .set({
      historyId: newHistoryId,
      lastIncrementalSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(syncState.userId, userId));

  return { type: "incremental", threadsUpdated, threadsRemoved, complete: true };
}

// ─── Cache helpers ──────────────────────────────────────────────────────────

function calculatePriority(labelIds: string[]): boolean {
  return labelIds.includes("IMPORTANT");
}

async function upsertThreadsToCache(
  userId: string,
  threads: EmailThread[]
): Promise<number> {
  if (threads.length === 0) return 0;

  for (let i = 0; i < threads.length; i += UPSERT_BATCH_SIZE) {
    const batch = threads.slice(i, i + UPSERT_BATCH_SIZE);
    const values = batch.map((thread) => ({
      userId,
      threadId: thread.id,
      historyId: thread.historyId,
      subject: thread.subject,
      snippet: thread.snippet,
      fromName: thread.from.name,
      fromEmail: thread.from.email,
      lastMessageDate: thread.lastMessageDate
        ? new Date(thread.lastMessageDate)
        : new Date(),
      messageCount: thread.messageCount,
      isUnread: thread.isUnread,
      isStarred: thread.isStarred,
      labelIds: thread.labelIds,
      hasAttachments: thread.hasAttachments,
      isPriority: calculatePriority(thread.labelIds),
      updatedAt: new Date(),
    }));

    await db
      .insert(cachedThreads)
      .values(values)
      .onConflictDoUpdate({
        target: [cachedThreads.userId, cachedThreads.threadId],
        set: {
          historyId: sql`excluded."historyId"`,
          subject: sql`excluded."subject"`,
          snippet: sql`excluded."snippet"`,
          fromName: sql`excluded."fromName"`,
          fromEmail: sql`excluded."fromEmail"`,
          lastMessageDate: sql`excluded."lastMessageDate"`,
          messageCount: sql`excluded."messageCount"`,
          isUnread: sql`excluded."isUnread"`,
          isStarred: sql`excluded."isStarred"`,
          labelIds: sql`excluded."labelIds"`,
          hasAttachments: sql`excluded."hasAttachments"`,
          isPriority: sql`excluded."isPriority"`,
          updatedAt: sql`excluded."updatedAt"`,
          // summary is intentionally omitted — preserved on conflict
        },
      });
  }

  return threads.length;
}

async function removeThreadsFromCache(
  userId: string,
  threadIds: string[]
): Promise<void> {
  if (threadIds.length === 0) return;

  await db
    .delete(cachedThreads)
    .where(
      and(
        eq(cachedThreads.userId, userId),
        inArray(cachedThreads.threadId, threadIds)
      )
    );
}
