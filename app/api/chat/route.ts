import { NextResponse } from "next/server";
import { z } from "zod";
import { getSiteReport } from "@/lib/services/report";
import { getAiProvider } from "@/lib/ai";
import { loadPrompt, fillPrompt } from "@/lib/ai/prompts";
import { aiChatSchema } from "@/lib/ai/schemas";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  siteId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Body must be { siteId, message }" }, { status: 400 });
  }

  const report = getSiteReport(parsed.siteId);
  if (!report) return NextResponse.json({ error: "site not found" }, { status: 404 });
  if (!report.job) {
    return NextResponse.json({
      answer: "This site has no completed analysis yet — run a scan first, then ask me about the findings.",
      refused: true,
    });
  }

  // Build the STRICT context: only stored analysis data enters the prompt.
  const analysis = {
    domain: report.site.domain,
    scannedPages: report.pages.map((p) => ({
      path: p.path,
      title: p.title,
      issueCount: p.issueCount,
      scores: p.scores,
      metrics: p.metrics,
    })),
    scores: report.scores,
    checkStats: {
      total: report.checks.length,
      evaluated: report.checks.filter((c) => c.status !== "not-evaluated").length,
      failed: report.checks.filter((c) => c.status === "fail").length,
      warnings: report.checks.filter((c) => c.status === "warning").length,
    },
    issues: report.issues.slice(0, config.limits.maxChatContextIssues).map((i) => ({
      severity: i.severity,
      category: i.category,
      page: i.pagePath,
      title: i.title,
      status: i.status,
      fix: i.fix?.slice(0, 200) ?? null,
    })),
    aiSummary: report.aiSummary,
  };

  try {
    const ai = getAiProvider();
    const prompt = fillPrompt(loadPrompt("chat"), {
      DOMAIN: report.site.domain,
      ANALYSIS: JSON.stringify(analysis),
      QUESTION: parsed.message,
    });
    const result = await ai.complete(prompt, { schema: aiChatSchema, schemaName: "chat" });
    return NextResponse.json(result);
  } catch (e) {
    logger.warn({ err: String(e) }, "chat failed");
    const msg = String(e);
    const error = /429|rate.?limit/i.test(msg)
      ? "The AI assistant is briefly rate-limited on the free tier — ask again in a minute."
      : /API_KEY|not set/i.test(msg)
        ? `The AI assistant is unavailable — the "${config.ai.provider}" provider needs its API key (AI_API_KEY or GEMINI_API_KEY) in the server environment.`
        : "The AI assistant hit an unexpected error — try again shortly.";
    return NextResponse.json({ error }, { status: 503 });
  }
}
