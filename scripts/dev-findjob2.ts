
import { getDb, schema } from '../lib/db/index';
import { like } from 'drizzle-orm';
console.log(getDb().select().from(schema.analysisJobs).where(like(schema.analysisJobs.id, '8882248f%')).all()[0].id);

