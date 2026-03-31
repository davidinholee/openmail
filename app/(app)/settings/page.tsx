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
          `Synced ${data.threadsUpdated} threads. ${data.threadsRemoved} removed. (${data.type} sync)`
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
    <div className="max-w-xl mx-auto px-8 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Manage your OpenMail preferences.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <h2 className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
            Email Index
          </h2>
          <p className="text-sm text-muted-foreground/70 mt-2 leading-relaxed">
            Generate one-line AI summaries of your recent emails to improve
            search quality and speed. This is a one-time operation for each
            email.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            className="rounded-xl h-10 text-[13px]"
          >
            {syncing ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            {syncing ? "Indexing..." : "Sync & Index Recent Emails"}
          </Button>
        </div>

        {syncResult && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            {syncResult}
          </div>
        )}
      </div>
    </div>
  );
}
