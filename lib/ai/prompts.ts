import fs from "node:fs";
import path from "node:path";

const PROMPTS_DIR = path.join(process.cwd(), "lib", "ai", "prompts");

const cache = new Map<string, string>();

/** Loads a prompt file from lib/ai/prompts (never hardcode prompts). */
export function loadPrompt(name: "vision" | "html-review" | "cross-page" | "fix-generator" | "chat"): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const text = fs.readFileSync(path.join(PROMPTS_DIR, `${name}.md`), "utf8");
  cache.set(name, text);
  return text;
}

/** Replaces {{KEY}} placeholders. */
export function fillPrompt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, String(v));
  }
  return out;
}
