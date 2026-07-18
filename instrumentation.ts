/**
 * Next.js server-boot hook. On a fresh deploy (empty database), the instance
 * seeds itself with REAL scans of the demo sites — see lib/services/seed.ts.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { seedIfEmpty } = await import("@/lib/services/seed");
    seedIfEmpty();
  } catch (e) {
    console.error("seed hook failed:", String(e).slice(0, 300));
  }
}
