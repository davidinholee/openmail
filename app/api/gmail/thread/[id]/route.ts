import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getThread } from "@/lib/gmail";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const thread = await getThread(session.accessToken, id);
    return NextResponse.json(thread);
  } catch (error) {
    console.error("Gmail thread error:", error);
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    );
  }
}
