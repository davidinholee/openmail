import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listThreads } from "@/lib/gmail";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || undefined;
  const labelIds = searchParams.get("labelIds")?.split(",") || undefined;
  const pageToken = searchParams.get("pageToken") || undefined;

  try {
    const result = await listThreads(session.accessToken, {
      query,
      labelIds,
      pageToken,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Gmail threads error:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
