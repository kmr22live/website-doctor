
import { getDb, schema } from '../lib/db/index';
import { and, eq } from 'drizzle-orm';
const db = getDb();
const i = db.select().from(schema.issues).where(and(eq(schema.issues.jobId, '8dab7b51-2e0a-4d42-8ebe-493a080112db'), eq(schema.issues.sourceCheckId, 'seo-canonical-present'))).all()[0];
db.update(schema.issues).set({ status: 'resolved', resolvedAt: Date.now() }).where(eq(schema.issues.id, i.id)).run();
console.log('marked resolved:', i.id, 'page:', i.pageId);

