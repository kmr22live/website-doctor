
import { getDb, schema } from '../lib/db/index';
import { eq, desc } from 'drizzle-orm';
const db = getDb();
const jobs = db.select().from(schema.analysisJobs).where(eq(schema.analysisJobs.websiteId, 'ee0b74ee-ca13-44e6-a421-92afc2f2287d')).orderBy(desc(schema.analysisJobs.createdAt)).all();
for (const j of jobs) console.log(j.id.slice(0,8), j.status, new Date(j.createdAt).toISOString());

