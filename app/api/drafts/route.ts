import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { drafts } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userDrafts = await db
    .select()
    .from(drafts)
    .where(eq(drafts.userId, session.user.id))
    .orderBy(desc(drafts.updatedAt));

  return Response.json(userDrafts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const [draft] = await db
    .insert(drafts)
    .values({
      userId: session.user.id,
      to: body.to || "",
      cc: body.cc || null,
      bcc: body.bcc || null,
      subject: body.subject || "",
      body: body.body || "",
      replyToThreadId: body.replyToThreadId || null,
    })
    .returning();

  return Response.json(draft, { status: 201 });
}
