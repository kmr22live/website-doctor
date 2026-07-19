import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const pageId = new URL(req.url).searchParams.get("page");
  if (!pageId) return NextResponse.json({ error: "page param required" }, { status: 400 });

  const db = getDb();
  const page = db.select().from(schema.pages).where(eq(schema.pages.id, pageId)).all()[0];
  if (!page?.screenshotPath) return NextResponse.json({ error: "no screenshot" }, { status: 404 });

  // Only serve files from inside the artifacts directory.
  const resolved = path.resolve(page.screenshotPath);
  if (!resolved.startsWith(path.resolve(config.artifactsDir)) || !fs.existsSync(resolved)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buf = fs.readFileSync(resolved);
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
