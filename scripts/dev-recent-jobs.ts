
import { getDb, schema } from '../lib/db/index';
import { desc } from 'drizzle-orm';
const db = getDb();
const jobs = db.select().from(schema.analysisJobs).orderBy(desc(schema.analysisJobs.createdAt)).limit(4).all();
for (const j of jobs) {
  console.log('=== job', j.id.slice(0,8), j.url, j.status, new Date(j.createdAt).toLocaleTimeString());
  const logs = JSON.parse(j.logsJson);
  for (const l of logs) if (l.level !== 'info') console.log('  ', l.level.toUpperCase(), l.message.slice(0, 180));
}

