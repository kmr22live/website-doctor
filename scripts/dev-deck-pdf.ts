
import { chromium } from 'playwright';
async function main() {
  const b = await chromium.launch();
  const pg = await (await b.newContext()).newPage();
  await pg.goto('file:///C:/Users/Arjun/website-doctor/docs/pitch-deck.html', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);
  await pg.pdf({ path: 'docs/pitch-deck.pdf', width: '1280px', height: '720px', printBackground: true, pageRanges: '1-10' });
  await b.close();
  console.log('saved docs/pitch-deck.pdf');
}
main().catch(e => { console.error('FAIL', String(e).slice(0,200)); process.exit(1); });

