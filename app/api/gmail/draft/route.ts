import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createDraft } from "@/lib/gmail";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, subject, body } = await req.json();

  if (!to || !subject || !body) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, body" },
      { status: 400 }
    );
  }

  try {
    const draftId = await createDraft(session.accessToken, to, subject, body);
    return NextResponse.json({ draftId });
  } catch (error) {
    console.error("Gmail draft error:", error);
    return NextResponse.json(
      { error: "Failed to create draft" },
      { status: 500 }
    );
  }
}
