import path from "node:path";

/**
 * Centralized app configuration. Every tunable (limits, timeouts, models,
 * scoring weights location) lives here — nothing hardcoded in services.
 */
export const config = {
  dataDir: process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
  dbFile: process.env.DB_FILE ?? path.join(process.cwd(), "data", "website-doctor.db"),
  artifactsDir:
    process.env.ARTIFACTS_DIR ?? path.join(process.cwd(), "data", "artifacts"),

  crawl: {
    maxPages: Number(process.env.MAX_PAGES ?? 10),
    timeoutMs: Number(process.env.CRAWL_TIMEOUT_MS ?? 30_000),
    navigationWaitUntil: "networkidle" as const,
    viewport: { width: 1366, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 WebsiteDoctor/1.0",
  },

  analyzers: {
    /** Cap Lighthouse runs per scan (each run costs ~10-20s). */
    lighthouseMaxPages: Number(process.env.LIGHTHOUSE_MAX_PAGES ?? 5),
    lighthouseTimeoutMs: Number(process.env.LIGHTHOUSE_TIMEOUT_MS ?? 75_000),
    /** Cap axe-core page revisits per scan. */
    axeMaxPages: Number(process.env.AXE_MAX_PAGES ?? 10),
    /** Cap broken-link HTTP probes per scan. */
    linkProbeMax: Number(process.env.LINK_PROBE_MAX ?? 30),
    /** Thresholds for Lighthouse-derived checks. */
    perfFailBelow: 50,
    lcpFailMs: 4000,
    clsFail: 0.25,
    tbtFailMs: 600,
  },

  ai: {
    provider: process.env.AI_PROVIDER ?? "gemini",
    /** OpenAI-compatible endpoints (Groq/OpenRouter/Mistral…): base URL + key. */
    baseUrl: process.env.AI_BASE_URL ?? "",
    apiKey: process.env.AI_API_KEY ?? "",
    model: process.env.AI_MODEL ?? "gemini-3.5-flash",
    /** Fallback chain: when a model's DAILY quota is exhausted, the provider
     *  auto-switches to the next model (per-minute limits still just wait). */
    modelFallbacks: (process.env.AI_MODEL_FALLBACKS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    visionModelFallbacks: (process.env.AI_VISION_FALLBACKS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    visionModel: process.env.AI_VISION_MODEL ?? process.env.AI_MODEL ?? "gemini-3.5-flash",
    maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 4096),
    temperature: Number(process.env.AI_TEMPERATURE ?? 0.2),
    maxIssuesForFixGeneration: Number(process.env.AI_MAX_FIX_ISSUES ?? 12),
    /** Pause between consecutive AI calls (ms) — keeps free tiers under their per-minute limits. */
    callGapMs: Number(process.env.AI_CALL_GAP_MS ?? 0),
    maxVisionPages: Number(process.env.AI_MAX_VISION_PAGES ?? 4),
    maxHtmlReviewPages: Number(process.env.AI_MAX_HTML_PAGES ?? 4),
    maxFindingsPerReview: Number(process.env.AI_MAX_FINDINGS ?? 3),
  },

  scoring: {
    // Per-severity deduction weights; category scores start at 100.
    deductions: { critical: 25, high: 15, medium: 8, low: 3 } as Record<string, number>,
    minScore: 0,
    maxScore: 100,
    healthLabels: { good: 75, needsAttention: 60 } as const,
  },

  limits: {
    maxLogLines: 500,
    maxIssueTitleLength: 200,
    maxChatContextIssues: 50,
  },
} as const;

export type AppConfig = typeof config;
