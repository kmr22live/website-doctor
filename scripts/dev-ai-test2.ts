
import 'dotenv/config';
import { z } from 'zod';
import fs from 'node:fs';
import { getAiProvider } from '../lib/ai/index';
async function main() {
  const ai = getAiProvider();
  console.log('provider:', ai.name);
  const schema = z.object({ greeting: z.string(), number: z.number() });
  const out = await ai.complete('Return a JSON object with a short greeting and the number 42.', { schema, schemaName: 'test' });
  console.log('TEXT OK:', JSON.stringify(out));
  const vSchema = z.object({ background: z.string(), word: z.string() });
  const img = fs.readFileSync('data/artifacts/' + fs.readdirSync('data/artifacts')[0] + '/' + fs.readdirSync('data/artifacts/' + fs.readdirSync('data/artifacts')[0]).find(f => f.endsWith('.png')), );
  const v = await ai.vision(img.toString('base64'), 'image/png', 'Name the dominant background color and one visible word.', { schema: vSchema, schemaName: 'vtest' });
  console.log('VISION OK:', JSON.stringify(v));
}
main().catch(e => { console.error('FAIL:', String(e).slice(0, 400)); process.exit(1); });

