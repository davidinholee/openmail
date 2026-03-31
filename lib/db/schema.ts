import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  uuid,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── NextAuth Tables ─────────────────────────────────────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

// ─── App Tables ──────────────────────────────────────────────────────────────

export const conversations = pgTable("conversation", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const messages = pgTable("message", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations"),
  draft: jsonb("draft"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ─── Sync & Cache Tables ────────────────────────────────────────────────────

export const syncState = pgTable("sync_state", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  historyId: text("historyId"),
  fullSyncCursor: text("fullSyncCursor"),
  fullSyncStartedAt: timestamp("fullSyncStartedAt", { mode: "date" }),
  lastFullSyncAt: timestamp("lastFullSyncAt", { mode: "date" }),
  lastIncrementalSyncAt: timestamp("lastIncrementalSyncAt", { mode: "date" }),
  syncStatus: text("syncStatus", { enum: ["idle", "syncing", "error"] })
    .notNull()
    .default("idle"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const cachedThreads = pgTable(
  "cached_thread",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadId: text("threadId").notNull(),
    historyId: text("historyId"),
    subject: text("subject"),
    snippet: text("snippet"),
    fromName: text("fromName"),
    fromEmail: text("fromEmail"),
    lastMessageDate: timestamp("lastMessageDate", { mode: "date" }),
    messageCount: integer("messageCount").default(1),
    isUnread: boolean("isUnread").default(false),
    isStarred: boolean("isStarred").default(false),
    labelIds: text("labelIds").array(),
    hasAttachments: boolean("hasAttachments").default(false),
    isPriority: boolean("isPriority").default(false),
    summary: text("summary"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("cached_thread_user_thread_idx").on(
      table.userId,
      table.threadId
    ),
    index("cached_thread_user_date_idx").on(table.userId, table.lastMessageDate),
    index("cached_thread_user_priority_idx").on(table.userId, table.isPriority),
  ]
);
