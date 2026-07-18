
import 'dotenv/config';
import { z } from 'zod';
import { GeminiProvider } from '../lib/ai/gemini';
async function main() {
  const ai = new GeminiProvider();
  const schema = z.object({ greeting: z.string(), number: z.number() });
  const out = await ai.complete('Return a JSON object with a short greeting and the number 42.', { schema, schemaName: 'test' });
  console.log('GEMINI OK:', JSON.stringify(out));
}
main().catch(e => { console.error('GEMINI FAIL:', String(e).slice(0, 500)); process.exit(1); });

