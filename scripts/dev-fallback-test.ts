import "dotenv/config";
import { z } from "zod";
import { getAiProvider } from "../lib/ai/index";

async function main() {
  const ai = getAiProvider();
  const schema = z.object({ ok: z.boolean(), model_hint: z.string() });
  const out = await ai.complete(
    "Return JSON: ok=true and model_hint set to the word 'switched'.",
    { schema, schemaName: "fallback-test" },
  );
  console.log("RESULT:", JSON.stringify(out));
}

main().catch((e: unknown) => {
  console.error("FAIL:", String(e).slice(0, 300));
  process.exit(1);
});
