import { notFound } from "next/navigation";
import { getJobReport } from "@/lib/services/report";
import { SEV, SEV_ORDER, SCORE_CARD_META, healthMeta, scoreColor, type SeverityKey } from "@/lib/ui/theme";

export const dynamic = "force-dynamic";

/** Print-friendly report route — Playwright turns this into the PDF export. */
export default async function PrintReportPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const report = getJobReport(jobId);
  if (!report || !report.job) notFound();

  const health = report.scores["health"] ?? 0;
  const hm = healthMeta(health);
  const issues = [...report.issues].sort(
    (a, b) => (SEV_ORDER[a.severity as SeverityKey] ?? 4) - (SEV_ORDER[b.severity as SeverityKey] ?? 4),
  );
  const counts: Record<SeverityKey, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of issues) {
    const k = i.severity as SeverityKey;
    if (k in counts) counts[k] += 1;
  }
  const evaluated = report.checks.filter((c) => c.status !== "not-evaluated");
  const errored = report.checks.filter((c) => c.status === "error");
  const notEvaluated = report.checks.filter((c) => c.status === "not-evaluated");
  const scanDate = report.job.finishedAt
    ? new Date(report.job.finishedAt).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div style={{ background: "#07090F", color: "#E7ECF4", fontFamily: "'Space Grotesk', sans-serif", padding: "48px 56px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #2DD4BF, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#04110D", fontWeight: 700, fontSize: 22 }}>+</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Website Doctor — Diagnosis report</div>
          <div style={{ fontSize: 13, color: "rgba(231,236,244,0.55)", fontFamily: "'JetBrains Mono', monospace" }}>
            {report.site.domain} · scanned {scanDate} · {report.pages.length} pages · {evaluated.length} checks run
            {" · "}{notEvaluated.length} not evaluated (N/A)
            {errored.length > 0 ? ` · ${errored.length} did not run properly` : ""}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 42, fontWeight: 700, color: hm.color, lineHeight: 1 }}>{health}</div>
          <div style={{ fontSize: 11, color: hm.color, fontWeight: 700 }}>{hm.label}</div>
        </div>
      </div>

      {/* Executive summary */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(231,236,244,0.45)" }}>Executive summary</div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(231,236,244,0.85)", marginTop: 10 }}>
          {report.aiSummary ??
            `The scan of ${report.site.domain} evaluated ${evaluated.length} automated checks across ${report.pages.length} page(s) and found ${issues.length} issues: ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium and ${counts.low} low. The overall health score is ${health}/100 (${hm.label.toLowerCase()}).`}
        </p>
      </div>

      {/* Scores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginTop: 28 }}>
        {SCORE_CARD_META.map((m) => {
          const v = report.scores[m.key] ?? 0;
          return (
            <div key={m.key} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11.5, color: "rgba(231,236,244,0.6)" }}>{m.label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, color: scoreColor(v), marginTop: 6 }}>{v}</div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", marginTop: 8 }}>
                <div style={{ height: "100%", width: `${v}%`, background: scoreColor(v), borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pages */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(231,236,244,0.45)", marginBottom: 12 }}>Pages crawled</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: "rgba(231,236,244,0.5)", textAlign: "left" }}>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>Path</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>Title</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>Status</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>Issues</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>LCP</th>
            </tr>
          </thead>
          <tbody>
            {report.pages.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontFamily: "'JetBrains Mono', monospace" }}>{p.path}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{p.title ?? "—"}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{p.statusCode ?? "—"}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{p.issueCount}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontFamily: "'JetBrains Mono', monospace" }}>{p.metrics["lcp"] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Issues + fixes */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(231,236,244,0.45)", marginBottom: 12 }}>
          Issues & recommended fixes ({issues.length})
        </div>
        {issues.map((i) => {
          const s = SEV[i.severity as SeverityKey] ?? SEV.low;
          return (
            <div key={i.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "16px 18px", marginBottom: 12, breakInside: "avoid" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 999, padding: "2px 10px", fontSize: 10.5, fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: 11.5, color: "rgba(231,236,244,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {i.category} · {i.pagePath ?? "Site-wide"} · {i.sourceCheckId}
                </span>
                {i.status === "resolved" ? <span style={{ fontSize: 11, color: "#34D399", fontWeight: 700 }}>RESOLVED</span> : null}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>{i.title}</div>
              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(231,236,244,0.75)", margin: "6px 0 0" }}>{i.description}</p>
              {i.businessImpact ? (
                <p style={{ fontSize: 12, lineHeight: 1.6, color: "#FCD34D", margin: "8px 0 0" }}>
                  <b>Business impact:</b> {i.businessImpact}
                </p>
              ) : null}
              {i.fix ? (
                <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(231,236,244,0.85)", margin: "8px 0 0" }}>
                  <b style={{ color: "#5EEAD4" }}>Fix:</b> {i.fix}
                </p>
              ) : null}
              {i.code ? (
                <pre style={{ background: "rgba(2,4,9,0.9)", border: "1px solid rgba(94,234,212,0.2)", color: "#99F6E4", borderRadius: 8, padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, lineHeight: 1.6, overflowX: "hidden", whiteSpace: "pre-wrap", margin: "10px 0 0" }}>{i.code}</pre>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 16, fontSize: 11, color: "rgba(231,236,244,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
        Generated by Website Doctor · {report.site.url} · job {report.job.id}
      </div>
    </div>
  );
}
