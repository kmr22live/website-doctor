import { z } from "zod";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { AIProviderError, type AIProvider, type CompleteOptions } from "@/lib/ai/provider";

function stripFences(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "") // reasoning models (qwen3…) prepend think blocks
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

type ChatMessageContent =
  | string
  | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

type ChatResponse = {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
};

class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs: number,
    readonly daily: boolean,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/** A per-DAY quota message means waiting won't help — switch models instead. */
export function isDailyQuotaMessage(msg: string): boolean {
  return /per day|TPD|RPD|daily/i.test(msg);
}

/** Candidate models in order: primary first, then fallbacks, skipping exhausted ones. */
export function buildModelChain(primary: string, fallbacks: string[], exhausted: Set<string>): string[] {
  const chain = [primary, ...fallbacks.filter((f) => f !== primary)];
  const usable = chain.filter((m) => !exhausted.has(m));
  // If everything is exhausted, still try the primary — quotas reset over time.
  return usable.length > 0 ? usable : [primary];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Models whose DAILY quota ran out — remembered for the process lifetime.
const globalForQuota = globalThis as unknown as { __wdExhaustedModels?: Set<string> };
function exhaustedModels(): Set<string> {
  if (!globalForQuota.__wdExhaustedModels) globalForQuota.__wdExhaustedModels = new Set();
  return globalForQuota.__wdExhaustedModels;
}

/** Known free-tier friendly endpoints selectable by provider name alone. */
export const OPENAI_COMPAT_BASE_URLS: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  mistral: "https://api.mistral.ai/v1",
  xai: "https://api.x.ai/v1",
  grok: "https://api.x.ai/v1",
};

/**
 * Provider for any OpenAI-compatible /chat/completions endpoint — unlocks the
 * free online tiers of Groq, OpenRouter (":free" models), Mistral, Cerebras…
 * with zero further code. Same contract as Gemini: zod-validated JSON out.
 */
export class OpenAICompatProvider implements AIProvider {
  readonly name: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(providerName: string) {
    this.name = providerName;
    this.baseUrl = (config.ai.baseUrl || OPENAI_COMPAT_BASE_URLS[providerName] || "").replace(/\/+$/, "");
    this.apiKey = config.ai.apiKey;
    if (!this.baseUrl) {
      throw new AIProviderError(
        `AI_BASE_URL is not set (and "${providerName}" has no built-in endpoint)`,
        providerName,
      );
    }
    if (!this.apiKey) throw new AIProviderError("AI_API_KEY is not set", providerName);
  }

  private async chat<T>(content: ChatMessageContent, opts: CompleteOptions<T>, useJsonMode: boolean, model: string): Promise<T> {
    const body: Record<string, unknown> = {
      model,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content },
      ],
      temperature: opts.temperature ?? config.ai.temperature,
      max_tokens: opts.maxOutputTokens ?? config.ai.maxOutputTokens,
    };
    if (useJsonMode) body.response_format = { type: "json_object" };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as ChatResponse;
    if (res.status === 429) {
      const ra = Number(res.headers.get("retry-after") ?? 0);
      const msg = data.error?.message?.slice(0, 250) ?? "rate limited";
      throw new RateLimitError(`HTTP 429: ${msg}`, Math.min(90_000, ra > 0 ? ra * 1000 : 20_000), isDailyQuotaMessage(msg));
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${data.error?.message ?? JSON.stringify(data).slice(0, 200)}`);
    }
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("empty response");
    return opts.schema.parse(JSON.parse(stripFences(text)));
  }

  private async generate<T>(content: ChatMessageContent, opts: CompleteOptions<T>, isVision: boolean): Promise<T> {
    // Ask for the schema in-prompt too — json_object mode guarantees JSON, zod
    // guarantees the shape, and models without json_object still comply.
    const schemaHint = `\n\nRespond with ONLY a JSON object matching this JSON Schema:\n${JSON.stringify(z.toJSONSchema(opts.schema))}`;
    const withHint: ChatMessageContent =
      typeof content === "string"
        ? content + schemaHint
        : [...content, { type: "text" as const, text: schemaHint }];

    const primary = opts.model ?? (isVision ? config.ai.visionModel : config.ai.model);
    const fallbacks = isVision ? config.ai.visionModelFallbacks : config.ai.modelFallbacks;
    const chain = buildModelChain(primary, fallbacks, exhaustedModels());

    let lastErr: unknown = null;
    for (const model of chain) {
      let jsonMode = true;
      let waitedForRateLimit = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await this.chat(withHint, opts, jsonMode, model);
        } catch (e) {
          lastErr = e;
          if (e instanceof RateLimitError) {
            if (e.daily) {
              // Daily quota gone — waiting won't help. Remember and auto-switch
              // to the next model in the chain.
              exhaustedModels().add(model);
              logger.warn({ provider: this.name, model, next: chain[chain.indexOf(model) + 1] ?? "none" }, "daily quota exhausted — switching model");
              break;
            }
            // Per-minute limit: wait ONCE, then give up on this call (the check
            // shows "not run" with a re-run button — honest and quick).
            if (waitedForRateLimit) break;
            waitedForRateLimit = true;
            logger.warn({ provider: this.name, model, waitMs: e.retryAfterMs }, "rate limited — waiting before retry");
            await sleep(e.retryAfterMs);
            continue;
          }
          // Non-429 failure: some models reject response_format — drop it and retry once.
          jsonMode = false;
          logger.warn({ attempt, provider: this.name, model, err: String(e).slice(0, 300) }, "openai-compat call failed");
        }
      }
      // Move to next model only for daily-quota breaks; other exhausted attempts stop here.
      if (!(lastErr instanceof RateLimitError && lastErr.daily)) break;
    }
    throw new AIProviderError(
      `${this.name} ${opts.schemaName} call failed: ${String(lastErr).slice(0, 300)}`,
      this.name,
    );
  }

  async complete<T>(prompt: string, opts: CompleteOptions<T>): Promise<T> {
    return this.generate(prompt, opts, false);
  }

  async vision<T>(imageB64: string, mimeType: string, prompt: string, opts: CompleteOptions<T>): Promise<T> {
    return this.generate(
      [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageB64}` } },
        { type: "text", text: prompt },
      ],
      opts,
      true,
    );
  }
}
