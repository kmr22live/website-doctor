
import { chromium } from 'playwright';
async function main() {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1160, height: 1000 }, deviceScaleFactor: 2 })).newPage();
  await pg.goto('file:///C:/Users/Arjun/AppData/Local/Temp/claude/C--Users-Arjun/7a7737cf-e185-481a-9b64-a873b06e40e5/scratchpad/legend-mock.html', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1200);
  await pg.screenshot({ path: 'design/legend-mockup.png', fullPage: true });
  await b.close();
  console.log('saved design/legend-mockup.png');
}
main().catch(e => { console.error(e); process.exit(1); });

