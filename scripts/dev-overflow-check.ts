
import { chromium } from 'playwright';
async function main() {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  await pg.goto('http://localhost:3000/analyzing/8dab7b51-2e0a-4d42-8ebe-493a080112db', { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(700);
  const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await pg.screenshot({ path: 'design/analyzing-fix.png' });
  console.log('horizontal overflow px:', overflow);
  await b.close();
}
main().catch(e => { console.error(e); process.exit(1); });

