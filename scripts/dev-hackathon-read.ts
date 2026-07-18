
import { chromium } from 'playwright';
async function main() {
  const b = await chromium.launch();
  const pg = await (await b.newContext()).newPage();
  await pg.goto('https://namastedev.com/hackathon', { waitUntil: 'networkidle', timeout: 45000 });
  await pg.waitForTimeout(1500);
  const text = await pg.evaluate(() => document.body.innerText);
  console.log(text.replace(/\n{3,}/g, '\n\n').slice(0, 12000));
  await b.close();
}
main().catch(e => { console.error('FAIL', String(e).slice(0,200)); process.exit(1); });

