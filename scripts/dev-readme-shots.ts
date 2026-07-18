// Captures real app screenshots for the README. Requires dev server on :3000
// with at least one scanned site.
import fs from "node:fs";
import { chromium } from "playwright";

async function main() {
  fs.mkdirSync("docs/screenshots", { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1.5 });
  const pg = await ctx.newPage();

  // 1. Home
  await pg.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: "docs/screenshots/home.png" });

  // 2. Projects
  await pg.goto("http://localhost:3000/projects", { waitUntil: "networkidle" });
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: "docs/screenshots/projects.png" });

  // Find the namastedev site (most interesting data)
  const res = await pg.evaluate(async () => {
    const r = await fetch("/api/sites");
    return (await r.json()) as { sites: { id: string; domain: string; issues: number }[] };
  });
  const site = res.sites.find((s) => s.domain.includes("namastedev")) ?? res.sites.sort((a, b) => b.issues - a.issues)[0];
  if (!site) throw new Error("no scanned sites — run a scan first");

  // 3. Dashboard overview
  await pg.goto(`http://localhost:3000/site/${site.id}`, { waitUntil: "networkidle" });
  await pg.waitForTimeout(1000);
  await pg.screenshot({ path: "docs/screenshots/dashboard.png" });

  // 4. Issues + drawer with affected elements
  await pg.click("text=Issues");
  await pg.waitForTimeout(600);
  const axeRow = pg.locator("text=Buttons must have discernible text").first();
  if (await axeRow.count()) {
    await axeRow.click();
    await pg.waitForTimeout(700);
  }
  await pg.screenshot({ path: "docs/screenshots/issue-drawer.png" });
  await pg.keyboard.press("Escape").catch(() => undefined);
  await pg.mouse.click(200, 400); // close drawer via backdrop

  // 5. Check registry with legend open
  await pg.waitForTimeout(400);
  await pg.click("text=Check registry");
  await pg.waitForTimeout(600);
  await pg.click("text=How to read this registry");
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: "docs/screenshots/registry.png" });

  // 6. Pages view
  await pg.click("text=Pages");
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: "docs/screenshots/pages.png" });

  await b.close();
  console.log("saved 6 screenshots to docs/screenshots/");
}

main().catch((e: unknown) => {
  console.error("FAIL", String(e).slice(0, 300));
  process.exit(1);
});
