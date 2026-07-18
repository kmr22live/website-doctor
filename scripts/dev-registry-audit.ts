
import { getDb, schema } from '../lib/db/index';
const db = getDb();
const defs = db.select().from(schema.checkDefinitions).all();
const impl = defs.filter(d => d.implemented);
const not = defs.filter(d => !d.implemented);
console.log('TOTAL defs:', defs.length, '| implemented:', impl.length, '| NOT implemented:', not.length);
console.log('--- NOT implemented by category:');
const byCat: Record<string, number> = {};
for (const d of not) byCat[d.category] = (byCat[d.category] ?? 0) + 1;
for (const [c, n] of Object.entries(byCat).sort((a,b)=>b[1]-a[1])) console.log('  ', String(n).padStart(3), c);
console.log('--- implemented by dataSource:');
const bySrc: Record<string, number> = {};
for (const d of impl) bySrc[d.dataSource] = (bySrc[d.dataSource] ?? 0) + 1;
for (const [s, n] of Object.entries(bySrc)) console.log('  ', String(n).padStart(3), s);

