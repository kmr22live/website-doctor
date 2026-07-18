
import { getDb, schema } from '../lib/db/index';
import { eq } from 'drizzle-orm';
const db = getDb();
const j = db.select().from(schema.analysisJobs).where(eq(schema.analysisJobs.id, '6f74e98b-b4db-494c-9bdd-b729c8d9c8e8')).all()[0];
console.log('stuck job status:', j?.status, '| stage:', j?.stage);

