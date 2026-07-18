
import { getDb, schema } from '../lib/db/index';
import { like } from 'drizzle-orm';
const j = getDb().select().from(schema.analysisJobs).where(like(schema.analysisJobs.id, '8dab7b51%')).all()[0];
console.log(j.id);

