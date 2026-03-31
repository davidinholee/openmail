import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMessage } from "@/lib/gmail";

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
    const message = await getMessage(session.accessToken, id);
    return NextResponse.json(message);
  } catch (error) {
    console.error("Gmail message error:", error);
    return NextResponse.json(
      { error: "Failed to fetch message" },
      { status: 500 }
    );
  }
}
