import { describe, expect, it } from "vitest";
import { OpenAICompatProvider, OPENAI_COMPAT_BASE_URLS, isDailyQuotaMessage, buildModelChain } from "@/lib/ai/openai-compat";
import { AIProviderError } from "@/lib/ai/provider";

describe("OpenAI-compatible provider (free online tiers)", () => {
  it("knows the built-in free-tier endpoints", () => {
    expect(OPENAI_COMPAT_BASE_URLS["groq"]).toContain("api.groq.com");
    expect(OPENAI_COMPAT_BASE_URLS["openrouter"]).toContain("openrouter.ai");
    expect(OPENAI_COMPAT_BASE_URLS["mistral"]).toContain("api.mistral.ai");
  });

  it("refuses to construct without an API key", () => {
    // config.ai.apiKey is empty in the test env
    expect(() => new OpenAICompatProvider("groq")).toThrow(AIProviderError);
  });

  it("refuses unknown providers without AI_BASE_URL", () => {
    expect(() => new OpenAICompatProvider("openai-compat")).toThrow(AIProviderError);
  });
});

describe("automatic model fallback on daily-quota exhaustion", () => {
  it("distinguishes daily-quota 429s from per-minute ones", () => {
    expect(isDailyQuotaMessage("Rate limit reached ... on tokens per day (TPD): Limit 100000")).toBe(true);
    expect(isDailyQuotaMessage("requests per day (RPD) exceeded")).toBe(true);
    expect(isDailyQuotaMessage("Rate limit reached ... tokens per minute (TPM)")).toBe(false);
  });

  it("builds the chain: primary first, fallbacks after, exhausted skipped", () => {
    expect(buildModelChain("a", ["b", "c"], new Set())).toEqual(["a", "b", "c"]);
    expect(buildModelChain("a", ["b", "c"], new Set(["a"]))).toEqual(["b", "c"]);
    expect(buildModelChain("a", ["b", "c"], new Set(["a", "b"]))).toEqual(["c"]);
    // primary duplicated in fallbacks is not repeated
    expect(buildModelChain("a", ["a", "b"], new Set())).toEqual(["a", "b"]);
    // everything exhausted → still try primary (quotas reset over time)
    expect(buildModelChain("a", ["b"], new Set(["a", "b"]))).toEqual(["a"]);
  });
});
