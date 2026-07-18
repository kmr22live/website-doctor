import type { z } from "zod";

export type CompleteOptions<T> = {
  /** zod schema — output is validated JSON matching this schema. */
  schema: z.ZodType<T>;
  /** Human-readable schema hint appended to the prompt for the model. */
  schemaName: string;
  system?: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
};

/**
 * Provider-agnostic AI interface. Gemini is the default implementation;
 * OpenAI/Claude/Ollama are swappable via config (AI_PROVIDER).
 * Every output is zod-validated JSON — no free-text parsing downstream.
 */
export interface AIProvider {
  readonly name: string;
  complete<T>(prompt: string, opts: CompleteOptions<T>): Promise<T>;
  vision<T>(imageB64: string, mimeType: string, prompt: string, opts: CompleteOptions<T>): Promise<T>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
