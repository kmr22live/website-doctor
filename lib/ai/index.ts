import { config } from "@/lib/config";
import { AIProviderError, type AIProvider } from "@/lib/ai/provider";
import { GeminiProvider } from "@/lib/ai/gemini";
import { OpenAICompatProvider, OPENAI_COMPAT_BASE_URLS } from "@/lib/ai/openai-compat";

const globalForAi = globalThis as unknown as { __wdAi?: AIProvider };

/**
 * Provider factory — swap providers via AI_PROVIDER env (gemini default).
 * "groq" / "openrouter" / "mistral" / "openai-compat" all use the
 * OpenAI-compatible provider (free online tiers, no purchase needed).
 */
export function getAiProvider(): AIProvider {
  if (globalForAi.__wdAi) return globalForAi.__wdAi;
  const name = config.ai.provider.toLowerCase();
  let provider: AIProvider;
  switch (name) {
    case "gemini":
      provider = new GeminiProvider();
      break;
    case "openai-compat":
    case "openai":
      provider = new OpenAICompatProvider(name);
      break;
    default:
      if (OPENAI_COMPAT_BASE_URLS[name]) {
        provider = new OpenAICompatProvider(name);
        break;
      }
      throw new AIProviderError(`Unknown AI provider "${name}"`, name);
  }
  globalForAi.__wdAi = provider;
  return provider;
}

export function aiAvailable(): boolean {
  try {
    getAiProvider();
    return true;
  } catch {
    return false;
  }
}
