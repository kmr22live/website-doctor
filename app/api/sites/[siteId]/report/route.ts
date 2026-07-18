import { NextResponse } from "next/server";
import { getSiteReport } from "@/lib/services/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const report = getSiteReport(siteId);
  if (!report) return NextResponse.json({ error: "site not found" }, { status: 404 });
  return NextResponse.json(report);
}
