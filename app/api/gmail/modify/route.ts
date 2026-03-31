import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { modifyMessage } from "@/lib/gmail";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId, addLabelIds, removeLabelIds } = await req.json();

  if (!messageId) {
    return NextResponse.json(
      { error: "Missing messageId" },
      { status: 400 }
    );
  }

  try {
    await modifyMessage(session.accessToken, messageId, {
      addLabelIds,
      removeLabelIds,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gmail modify error:", error);
    return NextResponse.json(
      { error: "Failed to modify message" },
      { status: 500 }
    );
  }
}
