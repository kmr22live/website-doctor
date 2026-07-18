import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { AIProviderError, type AIProvider, type CompleteOptions } from "@/lib/ai/provider";

function stripFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

/**
 * Gemini implementation of AIProvider. Uses Gemini's JSON response mode with a
 * response schema so every output parses; zod validates on top of that.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new AIProviderError("GEMINI_API_KEY is not set", this.name);
    this.client = new GoogleGenAI({ apiKey: key });
  }

  private async generate<T>(
    parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[],
    opts: CompleteOptions<T>,
  ): Promise<T> {
    const model = opts.model ?? config.ai.model;
    let lastErr: unknown = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction: opts.system,
            temperature: opts.temperature ?? config.ai.temperature,
            maxOutputTokens: opts.maxOutputTokens ?? config.ai.maxOutputTokens,
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(opts.schema),
          },
        });
        const text = response.text;
        if (!text) throw new Error("empty response");
        return opts.schema.parse(JSON.parse(stripFences(text)));
      } catch (e) {
        lastErr = e;
        logger.warn({ attempt, model, err: String(e).slice(0, 300) }, "gemini call failed");
      }
    }
    throw new AIProviderError(`Gemini ${opts.schemaName} call failed: ${String(lastErr).slice(0, 300)}`, this.name);
  }

  async complete<T>(prompt: string, opts: CompleteOptions<T>): Promise<T> {
    return this.generate([{ text: prompt }], opts);
  }

  async vision<T>(imageB64: string, mimeType: string, prompt: string, opts: CompleteOptions<T>): Promise<T> {
    return this.generate(
      [{ inlineData: { data: imageB64, mimeType } }, { text: prompt }],
      { ...opts, model: opts.model ?? config.ai.visionModel },
    );
  }
}
