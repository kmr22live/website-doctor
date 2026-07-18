
import { chromium } from 'playwright';
async function main() {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  await pg.goto('http://localhost:3000/site/ee0b74ee-ca13-44e6-a421-92afc2f2287d', { waitUntil: 'networkidle' });
  await pg.click('text=Issues');
  await pg.waitForTimeout(600);
  await pg.click('text=Buttons must have discernible text >> nth=0');
  await pg.waitForTimeout(700);
  await pg.screenshot({ path: 'design/affected-drawer.png' });
  await b.close();
  console.log('saved');
}
main().catch(e => { console.error(e); process.exit(1); });

