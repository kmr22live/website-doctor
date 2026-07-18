
import fs from 'node:fs';
import { chromium } from 'playwright';
async function main() {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 200, height: 100 } })).newPage();
  await pg.setContent('<body style="background:red;margin:0"><h1 style="color:white">HELLO</h1></body>');
  const buf = await pg.screenshot();
  await b.close();
  fs.writeFileSync('test-img-b64.txt', buf.toString('base64'));
  console.log('img bytes:', buf.length);
}
main();

