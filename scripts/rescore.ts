// One-off maintenance: recompute scores for every completed job using the
// current scoring model (config/scoring-weights.ts). Run: pnpm tsx scripts/rescore.ts
import { inArray } from "drizzle-orm";
import { getDb, schema } from "../lib/db/index";
import { computeScores } from "../lib/services/scoring";
import { rebuildEvaluatedChecks } from "../lib/services/rebuild-checks";

const db = getDb();
const jobs = db
  .select()
  .from(schema.analysisJobs)
  .where(inArray(schema.analysisJobs.status, ["completed", "partial"]))
  .all();

for (const job of jobs) {
  const checks = rebuildEvaluatedChecks(job.id);
  if (checks.length === 0) continue;
  const scores = computeScores(checks);
  for (const [category, score] of Object.entries(scores)) {
    db.insert(schema.scores)
      .values({ id: crypto.randomUUID(), jobId: job.id, websiteId: job.websiteId, category, score, createdAt: Date.now() })
      .onConflictDoUpdate({ target: [schema.scores.jobId, schema.scores.category], set: { score } })
      .run();
  }
  console.log(`rescored job ${job.id.slice(0, 8)} (${job.url}) -> health ${scores.health}`);
}
console.log(`done: ${jobs.length} job(s)`);
