import { NextResponse } from "next/server";
import { listSites } from "@/lib/services/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sites: listSites() });
}
