import { NextResponse } from "next/server";
import { z } from "zod";
import { createJob, ensureWebsite } from "@/lib/services/jobs";
import { startAnalysis } from "@/lib/services/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ url: z.string().min(1) });

function normalizeUrl(input: string): string | null {
  let candidate = input.trim();
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  try {
    const u = new URL(candidate);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Body must be { url: string }" }, { status: 400 });
  }

  const url = normalizeUrl(parsed.url);
  if (!url) {
    return NextResponse.json({ error: "That doesn't look like a valid URL" }, { status: 400 });
  }

  const site = ensureWebsite(url);
  const jobId = createJob(site.id, url);
  startAnalysis(jobId, site.id, url);

  return NextResponse.json({ jobId, siteId: site.id });
}
