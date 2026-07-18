import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ status: z.enum(["open", "resolved"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const { issueId } = await params;
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Body must be { status: 'open' | 'resolved' }" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.select().from(schema.issues).where(eq(schema.issues.id, issueId)).all()[0];
  if (!existing) return NextResponse.json({ error: "issue not found" }, { status: 404 });

  db.update(schema.issues)
    .set({ status: parsed.status, resolvedAt: parsed.status === "resolved" ? Date.now() : null })
    .where(eq(schema.issues.id, issueId))
    .run();

  return NextResponse.json({ ok: true, id: issueId, status: parsed.status });
}
