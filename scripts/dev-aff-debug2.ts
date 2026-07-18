
import { getSiteReport } from '../lib/services/report';
const r = getSiteReport('ee0b74ee-ca13-44e6-a421-92afc2f2287d')!;
const w = r.issues.filter(i => i.affected && i.affected.length > 0);
console.log('tsx direct — with affected:', w.length);
console.log(w[0]?.title, JSON.stringify(w[0]?.affected?.[0]));

