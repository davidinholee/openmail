import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listLabels } from "@/lib/gmail";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const labels = await listLabels(session.accessToken);
    return NextResponse.json(labels);
  } catch (error) {
    console.error("Gmail labels error:", error);
    return NextResponse.json(
      { error: "Failed to fetch labels" },
      { status: 500 }
    );
  }
}
