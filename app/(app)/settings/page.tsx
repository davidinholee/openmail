"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(
          `Indexed ${data.processed} emails. ${data.skipped} already cached.`
        );
      } else {
        setSyncResult(`Error: ${data.error}`);
      }
    } catch {
      setSyncResult("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your OpenMail preferences
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-6">
        <div>
          <h2 className="text-lg font-semibold">Email Index</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Index your recent emails to improve AI search quality. This
            generates one-line summaries of your emails and caches them for
            faster, more accurate search results.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {syncing ? "Indexing..." : "Sync & Index Recent Emails"}
          </Button>
        </div>

        {syncResult && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {syncResult}
          </div>
        )}
      </div>
    </div>
  );
}
