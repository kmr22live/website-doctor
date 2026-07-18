import { NextResponse } from "next/server";
import { getBrowser } from "@/lib/services/fetcher";
import { getJobReport } from "@/lib/services/report";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Real PDF export: Playwright print-to-PDF of the /report/:jobId/print route. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const report = getJobReport(jobId);
  if (!report) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const origin = new URL(req.url).origin;
  const printUrl = `${origin}/report/${jobId}/print`;

  try {
    const browser = await getBrowser();
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(printUrl, { waitUntil: "networkidle", timeout: 60_000 });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", bottom: "14mm", left: "10mm", right: "10mm" },
      });
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="website-doctor-${report.site.domain}.pdf"`,
        },
      });
    } finally {
      await context.close().catch(() => undefined);
    }
  } catch (e) {
    logger.error({ err: String(e) }, "pdf export failed");
    return NextResponse.json({ error: `PDF export failed: ${String(e).slice(0, 200)}` }, { status: 500 });
  }
}
