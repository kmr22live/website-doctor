
import { getDb, schema } from '../lib/db/index';
import { and, eq, like } from 'drizzle-orm';
const db = getDb();
const rows = db.select().from(schema.issues).where(and(eq(schema.issues.jobId, '8dab7b51-2e0a-4d42-8ebe-493a080112db'), like(schema.issues.sourceCheckId, 'axe-%'))).all();
console.log('axe issues:', rows.length);
console.log('with affectedJson:', rows.filter(r => r.affectedJson).length);
console.log('sample:', rows[0]?.affectedJson?.slice(0, 200) ?? 'NULL');

