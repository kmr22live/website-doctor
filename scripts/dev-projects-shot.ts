
import { chromium } from 'playwright';
async function main() {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  await pg.goto('http://localhost:3000/projects', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(600);
  const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await pg.screenshot({ path: 'design/projects-sidebar.png' });
  console.log('overflow px:', overflow);
  await b.close();
}
main().catch(e => { console.error(e); process.exit(1); });

