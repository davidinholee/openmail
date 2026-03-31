import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { performSync } from "@/lib/sync";

export const maxDuration = 300; // 5 minutes — full syncs can be large

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const forceFullSync = searchParams.get("force") === "full";
  console.log(`[sync route] POST /api/sync called, force=${forceFullSync}, user=${session.user.id}`);

  try {
    const start = Date.now();
    const result = await performSync(
      session.user.id,
      session.accessToken,
      forceFullSync
    );
    console.log(`[sync route] Result: complete=${result.complete}, updated=${result.threadsUpdated}`);
    return NextResponse.json({
      ...result,
      durationMs: Date.now() - start,
      forceFullSync,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
