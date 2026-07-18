
import { getDb, schema } from '../lib/db/index';
import { desc } from 'drizzle-orm';
import { getSiteReport } from '../lib/services/report';
const db = getDb();
const site = db.select().from(schema.websites).orderBy(desc(schema.websites.lastScanAt)).limit(1).all()[0];
const r = getSiteReport(site.id)!;
const cats = new Set(r.checks.map(c => c.category));
console.log(JSON.stringify({
  domain: site.domain,
  totalCheckRows: r.checks.length,
  evaluated: r.checks.filter(c => c.status !== 'not-evaluated').length,
  notEvaluated: r.checks.filter(c => c.status === 'not-evaluated').length,
  failed: r.checks.filter(c => c.status === 'fail').length,
  issues: r.issues.length,
  categories: cats.size,
  health: r.scores.health,
}));

