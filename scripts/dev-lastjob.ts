
import { getDb, schema } from '../lib/db/index';
import { desc } from 'drizzle-orm';
const db = getDb();
const job = db.select().from(schema.analysisJobs).orderBy(desc(schema.analysisJobs.createdAt)).limit(1).all()[0];
if (!job) { console.log('no jobs'); process.exit(0); }
const logs = JSON.parse(job.logsJson);
for (const l of logs) console.log(l.level.padEnd(5), l.message);

