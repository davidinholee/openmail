# OpenMail — AI-First Email Client

## Overview

An AI-first email client that integrates with Gmail, featuring natural language search with attribution, AI-powered email drafting, and a priority inbox. The interface is sleek, modern, and minimalistic with Gmail-level thread support.

---

## Decisions Log

| Decision | Choice | Notes |
|----------|--------|-------|
| LLM Provider | **Anthropic Claude** | Via Vercel AI SDK for provider abstraction |
| Email Sending | **Draft only** (no send in MVP) | Safer; user sends from Gmail |
| Chat Persistence | **Yes** — Neon Postgres | Conversations survive across sessions |
| Multi-user | **Yes** | Per-user token management, isolated data |
| Deployment | **Vercel** | Natural fit for Next.js |
| Inbox View | **Threads** | Gmail-like conversation view; feature parity goal |
| Search Context | **Subject + date + pre-generated summaries** | Cached in DB; generated lazily + optional batch sync |
| OAuth Scope | **Test users only for now** | Up to 100 test users; no Google verification needed yet |

---

## Features (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Chat — Natural Language Search** | User asks questions about their email in plain English; an AI agent generates Gmail search queries, retrieves relevant emails with cached summaries, and returns a natural language answer with attribution to specific emails. | P0 |
| **Chat — AI Email Drafting** | User describes an email they want to write; AI drafts it with options to edit, refine, and save as a Gmail draft. | P0 |
| **Full Inbox** | Gmail-like threaded email list view with labels, read/unread, stars, and email detail. | P1 |
| **Priority Inbox** | Shows emails filtered/ranked by importance (MVP: mirror of full inbox; smart ranking comes later). | P1 |

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────┐
│                        Frontend                          │
│  Next.js App Router (React + Tailwind + shadcn/ui)       │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐     │
│  │   Chat   │  │  Full Inbox  │  │ Priority Inbox │     │
│  └────┬─────┘  └──────┬───────┘  └───────┬────────┘     │
└───────┼───────────────┼──────────────────┼───────────────┘
        │               │                  │
        ▼               ▼                  ▼
┌──────────────────────────────────────────────────────────┐
│                    API Layer (Next.js)                    │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐ │
│  │ /api/chat    │  │ /api/gmail │  │ /api/sync        │ │
│  │ (streaming)  │  │ (CRUD)     │  │ (email indexing)  │ │
│  └──────┬───────┘  └─────┬──────┘  └────────┬─────────┘ │
└─────────┼────────────────┼──────────────────┼────────────┘
          │                │                  │
    ┌─────▼──────┐   ┌────▼─────┐    ┌──────▼───────┐
    │  Anthropic  │   │  Gmail   │    │    Neon      │
    │  Claude API │   │   API    │    │  (Postgres)  │
    └────────────┘   └──────────┘    └──────────────┘
```

### Natural Language Search Flow (Updated with Summaries)

```
User Query: "What did Sarah say about the Q3 budget?"
       │
       ▼
┌─────────────────────────────────────┐
│  1. Claude: Generate Gmail search   │
│     queries from user's question    │
│     → "from:sarah subject:budget"   │
│     → "from:sarah Q3 budget"        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  2. Gmail API: Execute search       │
│     → Returns message IDs + meta    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  3. Check Neon for cached summaries │
│     Hit? → Use cached summary       │
│     Miss? → Fetch body from Gmail,  │
│             generate summary via     │
│             Claude, cache in Neon    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  4. Claude receives per email:      │
│     • Subject line                  │
│     • Sender + recipients           │
│     • Date                          │
│     • One-line AI summary           │
│     • messageId (for attribution)   │
│                                     │
│     Agent decides:                  │◄──── Loop (max 3 rounds)
│     • Need more searches?           │
│     • Need full body of specific    │
│       email? → get_email_detail     │
│     • Ready to answer?              │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  5. Final answer with citations     │
│     [1] "Q3 Budget Review" from     │
│         Sarah Chen on Jan 15        │
└─────────────────────────────────────┘
```

### Pre-Generated Email Summaries: Design

The idea of pre-generating one-line summaries is strong. Here's how to implement it well:

**Approach: Lazy Generation + Optional Batch Sync**

Rather than eagerly summarizing every email on first login (which could cost $10-50+ for 10k emails and take over an hour), we use a hybrid:

1. **Lazy (on-demand):** When the search agent finds emails, we check Neon for a cached summary. Cache miss → generate summary on the fly, store it. This builds the cache organically with zero upfront cost.

2. **Batch sync (user-triggered):** A "Sync & Index" button in settings lets the user optionally kick off a background job that processes their last N days of email. This runs via a Vercel serverless function (or Vercel Cron for scheduled incremental sync).

3. **Incremental:** New emails get summarized lazily on first access, or via a lightweight polling job that runs every few minutes.

**Summary Schema (per email):**
```
email_summaries:
  id              UUID (PK)
  user_id         UUID (FK → users)
  message_id      VARCHAR (Gmail message ID, unique per user)
  thread_id       VARCHAR (Gmail thread ID)
  subject         TEXT
  sender          VARCHAR
  recipients      TEXT[]
  date            TIMESTAMP
  summary         TEXT (~50-100 words)
  labels          TEXT[]
  has_attachments  BOOLEAN
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
```

**Cost Estimate for Summaries:**
- Claude 3.5 Haiku: ~$0.0003 per email summary (input: ~500 tokens email body, output: ~30 tokens summary)
- 1,000 emails = ~$0.30
- 10,000 emails = ~$3.00
- 50,000 emails = ~$15.00

**Why this is better than raw truncated bodies:**
- Summaries are ~10x more compact than truncated bodies
- The agent can scan 100+ email summaries in a single context window
- Summaries capture semantic meaning (a truncated body might cut off the key info)
- Summaries are reusable across many queries — amortized cost drops to near-zero over time

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | Full-stack React; API routes for backend; deploys natively on Vercel |
| **Language** | TypeScript | Type safety across the stack |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Rapid, consistent, minimalistic components |
| **Auth** | NextAuth.js v5 (Auth.js) | Google OAuth with Gmail scopes; token refresh handling |
| **Gmail** | `googleapis` npm package | Official Google client for Gmail API |
| **LLM** | Anthropic Claude (claude-sonnet-4-20250514) | Strong natural language; good tool use |
| **AI SDK** | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | Streaming, tool calling, structured output; provider-agnostic if we ever switch |
| **Database** | Neon (Serverless Postgres) | Serverless, scales to zero, Vercel integration |
| **ORM** | Drizzle ORM | Type-safe, lightweight, great Neon/Postgres support |
| **State** | TanStack Query (React Query) | Caching, background refetch, optimistic updates for email data |
| **Deployment** | Vercel | Native Next.js support; edge network; easy env vars and preview deploys |

---

## Database Schema (Neon Postgres via Drizzle)

```sql
-- Users (linked to Google OAuth)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  avatar_url    TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- OAuth tokens (encrypted, per user)
CREATE TABLE accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          VARCHAR(50) NOT NULL,         -- 'google'
  provider_account_id VARCHAR(255) NOT NULL,
  access_token      TEXT,                         -- encrypted
  refresh_token     TEXT,                         -- encrypted
  expires_at        INTEGER,
  token_type        VARCHAR(50),
  scope             TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Chat conversations
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255),                    -- auto-generated from first message
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Chat messages (user + assistant messages)
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL,          -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  citations       JSONB,                         -- [{messageId, subject, sender, date, snippet}]
  draft           JSONB,                         -- {to, subject, body} if this is a draft response
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Cached email summaries
CREATE TABLE email_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id      VARCHAR(255) NOT NULL,         -- Gmail message ID
  thread_id       VARCHAR(255),                  -- Gmail thread ID
  subject         TEXT,
  sender          VARCHAR(255),
  recipients      TEXT,
  date            TIMESTAMP,
  summary         TEXT,                          -- AI-generated one-line summary
  labels          TEXT[],
  has_attachments BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- Sessions (for NextAuth)
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX idx_email_summaries_user_message ON email_summaries(user_id, message_id);
CREATE INDEX idx_email_summaries_user_thread ON email_summaries(user_id, thread_id);
CREATE INDEX idx_email_summaries_user_date ON email_summaries(user_id, date DESC);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
```

---

## API Keys & Credentials Required

### 1. Google Cloud Platform (Gmail API + OAuth)
- **What:** OAuth 2.0 Client ID + Client Secret
- **How to get:**
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Create a new project (e.g., "OpenMail")
  3. Enable the **Gmail API**
  4. Configure the **OAuth consent screen** (External, add test users)
  5. Create **OAuth 2.0 credentials** (Web application type)
  6. Redirect URIs:
     - Dev: `http://localhost:3000/api/auth/callback/google`
     - Prod: `https://your-app.vercel.app/api/auth/callback/google`
  7. Copy the Client ID and Client Secret
- **Scopes needed:**
  - `https://www.googleapis.com/auth/gmail.readonly` (read emails + search)
  - `https://www.googleapis.com/auth/gmail.compose` (create drafts)
  - `https://www.googleapis.com/auth/gmail.modify` (mark read, archive, label)
  - `openid`, `email`, `profile` (basic auth)

### 2. Anthropic API Key
- **What:** API key for Claude
- **Get it at:** [console.anthropic.com](https://console.anthropic.com/)
- **Estimated cost:** ~$0.01–0.05 per search query; ~$0.001 per email summary

### 3. Neon Database
- **What:** Postgres connection string
- **Get it at:** [neon.tech](https://neon.tech/) (free tier: 0.5 GB storage, generous compute)
- **Vercel integration:** Add via Vercel dashboard → Storage → Neon for auto-configured env vars

### 4. NextAuth Secret
- **What:** Random string for session encryption
- **Generate:** `openssl rand -base64 32`

### Environment Variables (`.env.local`)
```
# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# AI
ANTHROPIC_API_KEY=

# Database
DATABASE_URL=              # Neon connection string (pooled)
```

---

## Implementation Plan

### Phase 0: Project Setup (~0.5 day)
- [ ] Initialize Next.js 15 with TypeScript, Tailwind v4, ESLint
- [ ] Install and configure shadcn/ui
- [ ] Install core dependencies: `googleapis`, `ai`, `@ai-sdk/anthropic`, `drizzle-orm`, `@neondatabase/serverless`, `next-auth`
- [ ] Set up project folder structure
- [ ] Configure `.env.local` with placeholder vars
- [ ] Set up Neon database + Drizzle schema + migrations
- [ ] Set up Google Cloud project, enable Gmail API, create OAuth credentials
- [ ] Obtain Anthropic API key

### Phase 1: Authentication & Gmail Connection (~1.5 days)
- [ ] Configure NextAuth.js v5 with Google provider + Gmail scopes
- [ ] Implement Drizzle adapter for NextAuth (users, accounts, sessions tables)
- [ ] Store encrypted OAuth tokens in Neon (access_token, refresh_token)
- [ ] Implement token refresh middleware (auto-refresh expired tokens)
- [ ] Build Gmail API service layer (`lib/gmail.ts`):
  - `searchMessages(accessToken, query, maxResults)` → message IDs + metadata
  - `getMessage(accessToken, messageId)` → full message with parsed body
  - `getThread(accessToken, threadId)` → full thread with all messages
  - `listMessages(accessToken, labelIds?, pageToken?, maxResults?)` → paginated list
  - `createDraft(accessToken, to, subject, body)` → draft ID
  - `listLabels(accessToken)` → user's Gmail labels
- [ ] Build email body parser (Gmail returns base64-encoded MIME; need to extract text/HTML)
- [ ] Test: Login → fetch 10 recent emails → display in console

### Phase 2: Core Layout & Design System (~1 day)
- [ ] Build app shell layout:
  - Left sidebar (collapsible): navigation items with icons
    - Chat (message icon)
    - Inbox (inbox icon)
    - Priority (star icon)
    - Settings (gear icon)
  - Main content area
  - Responsive: sidebar becomes bottom tab bar on mobile
- [ ] Design system tokens:
  - Font: Geist Sans (ships with Next.js 15)
  - Colors: neutral grays + single accent (blue or indigo)
  - Spacing: 8px grid
  - Borders: subtle, 1px, rounded-lg
  - Transitions: 150ms ease for all interactive elements
- [ ] Protected route wrapper (redirect to login if unauthenticated)
- [ ] User avatar + account dropdown in sidebar footer

### Phase 3: Full Inbox — Thread List View (~1.5 days)
- [ ] Fetch threads via Gmail API (paginated, 25 per page)
- [ ] Thread list component:
  - Sender avatars/initials (color-coded)
  - Subject line (bold if unread)
  - Snippet preview (last message)
  - Relative timestamp ("2h ago", "Yesterday", "Jan 15")
  - Unread indicator (dot or bold)
  - Star toggle
  - Attachment icon if present
  - Label chips
- [ ] Infinite scroll / "Load more" pagination
- [ ] Gmail-style search bar at top (passes query to Gmail search API)
- [ ] Skeleton loading states
- [ ] Empty state

### Phase 4: Full Inbox — Thread Detail View (~1.5 days)
- [ ] Click thread → slide-in or navigate to thread detail
- [ ] Thread detail view (Gmail-like):
  - Subject as header
  - Each message in thread shown as expandable card
  - Most recent message expanded by default, others collapsed
  - Per message: sender, recipients, date, body (rendered HTML safely)
  - Attachment list with filenames and download links
- [ ] Action bar: Archive, Star, Mark unread, Label, Back
- [ ] "Reply" button → opens draft composer (Phase 6 integration)
- [ ] Render HTML email bodies safely (sanitized iframe or DOMPurify)

### Phase 5: Priority Inbox (MVP = Clone) (~0.5 day)
- [ ] Same thread list component as Full Inbox
- [ ] Fetch from Gmail with `labelIds: ['IMPORTANT']` or `CATEGORY_PRIMARY`
- [ ] Placeholder banner: "Smart AI ranking coming soon"
- [ ] (Future: LLM-based importance scoring)

### Phase 6: Chat — Natural Language Search (~2.5 days)
- [ ] **Chat UI**
  - Conversation list in sidebar (or sub-nav within Chat section)
  - New conversation button
  - Chat message thread (scrollable, auto-scroll to bottom)
  - User messages (right-aligned or left-aligned with avatar)
  - Assistant messages (streaming tokens, markdown rendered)
  - Inline email citation cards (clickable → opens thread detail)
  - Input bar at bottom: text input + send button
  - "Searching your emails..." thinking indicator with animated dots

- [ ] **Backend: Search Agent** (`app/api/chat/route.ts`)
  - Use Vercel AI SDK `streamText()` with Anthropic provider
  - System prompt (see Agent Prompt Design section below)
  - Tool definitions:
    ```
    search_emails({ query: string, maxResults?: number })
      → Executes Gmail search
      → For each result, checks Neon for cached summary
      → Cache miss: fetch body from Gmail, generate summary via Claude, cache in Neon
      → Returns: [{ messageId, threadId, subject, sender, date, summary }]

    get_email_detail({ messageId: string })
      → Fetches full email body from Gmail
      → Returns: { messageId, subject, sender, recipients, date, body }
    ```
  - Agentic loop handled by AI SDK's `maxSteps: 3`
  - Stream response to frontend

- [ ] **Attribution System**
  - Claude cites emails using `[1]`, `[2]` markers
  - Parse citations from response text
  - Render citation cards below response:
    - Subject, sender, date, summary snippet
    - "View thread" → navigates to thread detail
    - "Open in Gmail" → external link
  - Validate cited messageIds exist in search results

- [ ] **Conversation Persistence**
  - On new conversation: create row in `conversations` table
  - On each message: insert into `messages` table
  - On page load: fetch conversation list from Neon
  - On conversation click: fetch messages from Neon, display history
  - Auto-title: after first assistant response, generate a short title

### Phase 7: Chat — AI Email Drafting (~1.5 days)
- [ ] **Drafting Flow**
  - User types "Draft an email to John about rescheduling our meeting"
  - Agent detects intent → generates draft as structured output
  - Draft preview card rendered in chat:
    - To, Subject, Body displayed in email-like card
    - Action buttons: "Edit", "Regenerate", "Save as Draft"
  - "Edit" → inline editor with pre-filled fields
  - "Regenerate" → sends refinement request to Claude
  - "Save as Draft" → calls Gmail `createDraft` API, shows confirmation
  - Iterative refinement: "make it shorter", "more formal", "add the deadline"

- [ ] **Backend: Draft Agent**
  - Same chat endpoint, different system prompt behavior
  - Agent detects drafting intent from user message
  - Structured output: `{ to: string, subject: string, body: string }`
  - Tool: `save_draft({ to, subject, body })` → Gmail createDraft API

### Phase 8: Email Sync & Summary Generation (~1 day)
- [ ] **Lazy summarization** (built into search flow — Phase 6)
  - When search returns emails without cached summaries, generate on the fly
  - Store in `email_summaries` table for future queries

- [ ] **Batch sync endpoint** (`/api/sync`)
  - User-triggered from Settings: "Index my recent emails"
  - Fetches last N days of email (configurable: 30/90/365)
  - Processes in batches of 10 (parallel summary generation)
  - Progress indicator in UI (X of Y emails indexed)
  - Idempotent: skips emails already in `email_summaries`

- [ ] **Incremental sync** (future, post-MVP)
  - Gmail push notifications via Pub/Sub (or polling every 5 min)
  - Summarize new emails automatically

### Phase 9: Polish & UX (~1.5 days)
- [ ] Dark mode / light mode toggle (system preference default)
- [ ] Keyboard shortcuts:
  - `Cmd+K` → search bar focus
  - `Cmd+N` → new chat / new draft
  - `Escape` → close detail view
  - `j/k` → navigate email list
- [ ] Toast notifications (draft saved, error messages, etc.)
- [ ] Error boundaries and error states
- [ ] Empty states with helpful illustrations
- [ ] Mobile responsive refinements
- [ ] Loading skeletons for all async content

---

## Project Structure

```
openmail/
├── app/
│   ├── layout.tsx                    # Root layout: auth provider, query provider
│   ├── page.tsx                      # Landing / redirect to /chat
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              # Login page with Google OAuth button
│   ├── (app)/                        # Authenticated app routes (shared layout)
│   │   ├── layout.tsx                # App shell: sidebar + main area
│   │   ├── chat/
│   │   │   ├── page.tsx              # Chat (new conversation)
│   │   │   └── [conversationId]/
│   │   │       └── page.tsx          # Chat (existing conversation)
│   │   ├── inbox/
│   │   │   ├── page.tsx              # Full inbox thread list
│   │   │   └── [threadId]/
│   │   │       └── page.tsx          # Thread detail view
│   │   ├── priority/
│   │   │   └── page.tsx              # Priority inbox
│   │   └── settings/
│   │       └── page.tsx              # Settings (sync, preferences)
│   └── api/
│       ├── auth/[...nextauth]/
│       │   └── route.ts              # NextAuth handler
│       ├── chat/
│       │   └── route.ts              # Chat streaming endpoint
│       ├── conversations/
│       │   ├── route.ts              # List/create conversations
│       │   └── [id]/
│       │       ├── route.ts          # Get/delete conversation
│       │       └── messages/
│       │           └── route.ts      # Get messages for conversation
│       ├── gmail/
│       │   ├── threads/
│       │   │   └── route.ts          # List/search threads
│       │   ├── thread/[id]/
│       │   │   └── route.ts          # Get full thread
│       │   ├── message/[id]/
│       │   │   └── route.ts          # Get single message
│       │   ├── draft/
│       │   │   └── route.ts          # Create draft
│       │   ├── labels/
│       │   │   └── route.ts          # List labels
│       │   └── modify/
│       │       └── route.ts          # Archive, star, mark read
│       └── sync/
│           └── route.ts              # Batch email sync + summarization
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx               # Main navigation sidebar
│   │   ├── app-shell.tsx             # Sidebar + main content wrapper
│   │   └── user-menu.tsx             # Avatar + dropdown (sign out, settings)
│   ├── chat/
│   │   ├── chat-sidebar.tsx          # Conversation list
│   │   ├── chat-thread.tsx           # Message thread display
│   │   ├── chat-input.tsx            # Input bar with send button
│   │   ├── message-bubble.tsx        # Single message (user or assistant)
│   │   ├── email-citation.tsx        # Inline email reference card
│   │   ├── draft-preview.tsx         # Draft card with actions
│   │   └── thinking-indicator.tsx    # "Searching..." animation
│   ├── inbox/
│   │   ├── thread-list.tsx           # Scrollable thread list
│   │   ├── thread-list-item.tsx      # Single thread row
│   │   ├── thread-detail.tsx         # Full thread view
│   │   ├── message-card.tsx          # Single message in thread (expandable)
│   │   ├── email-actions.tsx         # Archive, star, label buttons
│   │   ├── search-bar.tsx            # Gmail-style search
│   │   └── label-chip.tsx            # Colored label badge
│   └── ui/                           # shadcn/ui components
├── lib/
│   ├── gmail.ts                      # Gmail API client (all Gmail operations)
│   ├── gmail-parser.ts               # MIME parsing, HTML extraction, sanitization
│   ├── auth.ts                       # NextAuth v5 config
│   ├── db/
│   │   ├── index.ts                  # Drizzle client + Neon connection
│   │   ├── schema.ts                 # Drizzle schema (all tables)
│   │   └── migrations/               # Drizzle migration files
│   ├── ai/
│   │   ├── search-agent.ts           # System prompt + tool defs for search
│   │   ├── draft-agent.ts            # System prompt + tool defs for drafting
│   │   ├── summarizer.ts             # Email → one-line summary generator
│   │   └── tools.ts                  # Shared tool implementations
│   └── utils.ts                      # Date formatting, truncation, etc.
├── types/
│   ├── email.ts                      # Gmail types (Thread, Message, Label)
│   └── chat.ts                       # Chat types (Conversation, Message, Citation)
├── hooks/
│   ├── use-threads.ts                # TanStack Query hook for email threads
│   ├── use-thread.ts                 # Single thread fetcher
│   ├── use-conversations.ts          # Chat conversation list
│   └── use-gmail-actions.ts          # Archive, star, mark read mutations
├── drizzle.config.ts                 # Drizzle config
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Agent Prompt Design

### Search Agent

```
SYSTEM PROMPT:

You are OpenMail's email search assistant. You help the user find information
in their Gmail inbox by searching their emails and synthesizing clear answers.

TOOLS AVAILABLE:

1. search_emails({ query: string, maxResults?: number })
   Searches Gmail using Gmail search syntax. Supports operators:
   from:, to:, subject:, before:YYYY/MM/DD, after:YYYY/MM/DD,
   has:attachment, is:unread, is:starred, label:, newer_than:Xd,
   older_than:Xd, filename:, cc:, bcc:, in:anywhere
   Returns: array of { messageId, threadId, subject, sender, date, summary }
   where summary is a concise one-line description of the email's content.

2. get_email_detail({ messageId: string })
   Fetches the full body of a specific email when you need more detail
   than the summary provides.
   Returns: { messageId, threadId, subject, sender, recipients, date, body }

INSTRUCTIONS:

1. Analyze the user's question. Think about which Gmail search operators
   and keywords will best find the relevant emails.
2. Call search_emails with a well-crafted query. Use multiple operators
   for precision (e.g. "from:sarah subject:budget after:2025/01/01").
3. Review the summaries. If you need more detail about a specific email,
   call get_email_detail with its messageId.
4. You may search up to 3 times with different queries if initial results
   are insufficient. Try different keyword strategies and operators.
5. When you have enough information, provide a clear natural language answer.
6. ALWAYS cite specific emails you reference using numbered markers: [1], [2], etc.
   At the end of your response, list each citation:
   [1] "Subject Line" — Sender Name, Date
   [2] "Subject Line" — Sender Name, Date
7. If you cannot find relevant emails, say so clearly. Suggest the user
   rephrase or provide more details about what they're looking for.
8. Be concise but thorough. If the user asks for a summary, summarize.
   If they ask a specific question, answer directly.
```

### Draft Agent

```
SYSTEM PROMPT:

You are OpenMail's email drafting assistant. You help the user compose
professional, clear emails.

When the user asks you to draft an email, respond with a structured draft
containing: recipient (to), subject line, and email body.

TOOLS AVAILABLE:

1. save_draft({ to: string, subject: string, body: string })
   Saves the email as a draft in the user's Gmail account.
   Only call this when the user explicitly confirms they want to save.

INSTRUCTIONS:

1. When the user describes an email they want to write, generate a complete
   draft with to, subject, and body.
2. Present the draft clearly so the user can review it.
3. If the user requests changes ("make it shorter", "more formal",
   "add a note about the deadline"), revise accordingly.
4. Only call save_draft when the user says "save", "looks good", or
   explicitly approves the draft.
5. Match the tone the user requests. Default to professional but friendly.
6. Keep emails concise unless the user asks for detail.
```

---

## Deployment Notes (Vercel)

### Vercel Configuration
- **Framework Preset:** Next.js (auto-detected)
- **Build Command:** `next build` (default)
- **Output Directory:** `.next` (default)
- **Node.js Version:** 20.x
- **Environment Variables:** Set all `.env.local` vars in Vercel dashboard

### Vercel-Specific Considerations
- **Serverless function timeout:** 10s on Hobby plan, 60s on Pro. The agentic search loop may take 15-30s. **Recommendation: Use Vercel Pro ($20/mo)** for 60s timeout, or use streaming which keeps the connection alive beyond the timeout as long as data flows.
- **Neon integration:** Add Neon via Vercel dashboard → Storage tab. This auto-configures `DATABASE_URL` and enables connection pooling.
- **Domain:** Add custom domain in Vercel dashboard. Update Google OAuth redirect URI to match.
- **Preview deployments:** Each PR gets a preview URL. Add preview URLs to Google OAuth redirect URIs, or use a wildcard pattern.
- **Edge compatibility:** Gmail API calls require Node.js runtime (not Edge). Set `export const runtime = 'nodejs'` on API routes that use `googleapis`.

### Google OAuth for Production
- Update redirect URIs in Google Cloud Console to include production URL
- Add production domain to authorized JavaScript origins
- For >100 users: submit OAuth consent screen for Google verification (takes 2-6 weeks)

---

## Estimated Timeline

| Phase | Effort | Cumulative |
|-------|--------|-----------|
| Phase 0: Project Setup | 0.5 day | 0.5 days |
| Phase 1: Auth & Gmail | 1.5 days | 2 days |
| Phase 2: Layout & Design | 1 day | 3 days |
| Phase 3: Inbox — Thread List | 1.5 days | 4.5 days |
| Phase 4: Inbox — Thread Detail | 1.5 days | 6 days |
| Phase 5: Priority Inbox | 0.5 day | 6.5 days |
| Phase 6: Chat — NL Search | 2.5 days | 9 days |
| Phase 7: Chat — AI Drafting | 1.5 days | 10.5 days |
| Phase 8: Email Sync & Summaries | 1 day | 11.5 days |
| Phase 9: Polish & UX | 1.5 days | 13 days |

**Total estimated: ~2.5 weeks for a polished MVP.**

---

## Future Enhancements (Post-MVP)

- **Smart Priority Inbox** — LLM scores email importance based on sender relationship, content urgency, user behavior patterns
- **Gmail Push Notifications** — Real-time email sync via Google Pub/Sub instead of polling
- **Semantic search upgrade** — Hybrid: Gmail search for filtering + vector embeddings (pgvector in Neon) for re-ranking
- **Email summaries digest** — Daily/weekly AI-generated summary of key emails
- **Auto-categorization** — AI-assigned labels beyond Gmail's built-in categories
- **Quick replies** — AI-suggested short responses shown on each email
- **Scheduled sending** — Compose now, send later
- **Multi-account** — Manage multiple Gmail accounts in one interface
- **Local LLM option** — Privacy-first mode using Ollama for users who don't want cloud AI
- **Attachment search** — "Find the PDF John sent me last month" with attachment content indexing
