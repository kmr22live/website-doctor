import { eq } from 'drizzle-orm';
import { getSiteReport } from '../lib/services/report';
const r = getSiteReport('ee0b74ee-ca13-44e6-a421-92afc2f2287d')!;
console.log('domain:', r.site.domain, '| pages:', r.pages.length, '| health:', r.scores.health);
console.log('scores:', JSON.stringify(r.scores));
const perf = r.issues.filter(i => i.category === 'Performance');
console.log('perf issues:', perf.length);
const byCheck: Record<string, number> = {};
for (const i of perf) byCheck[i.sourceCheckId] = (byCheck[i.sourceCheckId] ?? 0) + 1;
console.log('perf issues by rule:', JSON.stringify(byCheck));

