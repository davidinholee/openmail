ALTER TABLE "sync_state" ADD COLUMN "fullSyncCursor" text;--> statement-breakpoint
ALTER TABLE "sync_state" ADD COLUMN "fullSyncStartedAt" timestamp;