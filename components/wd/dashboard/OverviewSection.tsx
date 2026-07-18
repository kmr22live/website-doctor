"use client";

import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_MONO, SEV, SEV_ORDER, SCORE_CARD_META, healthMeta, scoreColor, scoreGlow, type SeverityKey } from "@/lib/ui/theme";
import { CATEGORY_TO_SCORE } from "@/lib/score-map";
import type { SiteReport } from "@/lib/services/report";

const STAGE_LABELS: Record<string, string> = {
  lighthouse: "Lighthouse audit",
  axe: "Accessibility scan",
  security: "Security probe",
  "code-validation": "Link & code checks",
  "ai-vision": "AI vision review",
  "ai-html": "AI HTML review",
  "cross-page": "Cross-page review",
  fixes: "Fix generation",
};

export function OverviewSection({
  report,
  onOpenIssue,
  onGoIssues,
  onAskAi,
  onGoChecks,
}: {
  report: SiteReport;
  onOpenIssue: (id: string) => void;
  onGoIssues: () => void;
  onAskAi: () => void;
  onGoChecks: () => void;
}) {
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
  const total = issues.length;

  // Donut geometry (from design contract)
  const C = 2 * Math.PI * 44;
  let acc = 0;
  const donutSegs = (Object.keys(counts) as SeverityKey[])
    .filter((k) => counts[k] > 0)
    .map((k) => {
      const frac = counts[k] / Math.max(1, total);
      const seg = { color: SEV[k].main, dash: `${Math.max(1, frac * C - 4)} ${C - frac * C + 4}`, offset: -acc * C };
      acc += frac;
      return seg;
    });

  const ringC = 2 * Math.PI * 62;

  // Radar geometry
  const cx = 130;
  const cy = 106;
  const R = 78;
  const radarShort: Record<string, string> = {
    seo: "SEO",
    accessibility: "A11y",
    performance: "Perf",
    ux: "UX",
    conversion: "Conv",
    "best-practices": "Best pr.",
  };
  const axesData = SCORE_CARD_META.map((m) => [radarShort[m.key] ?? m.label, report.scores[m.key] ?? 0] as const);
  const pt = (i: number, r: number): [number, number] => {
    const a = ((i * 60 - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const radarGrid = [0.33, 0.66, 1].map((f) =>
    axesData.map((_, i) => pt(i, R * f).map((n) => n.toFixed(1)).join(",")).join(" "),
  );
  const radarAxes = axesData.map(([label], i) => {
    const [x, y] = pt(i, R);
    const [lx, ly] = pt(i, R + 18);
    return { x: x.toFixed(1), y: y.toFixed(1), lx: lx.toFixed(1), ly: (ly + 4).toFixed(1), label };
  });
  const radarDots = axesData.map(([, v], i) => {
    const [x, y] = pt(i, (R * v) / 100);
    return { x: x.toFixed(1), y: y.toFixed(1) };
  });
  const radarPoints = radarDots.map((d) => `${d.x},${d.y}`).join(" ");

  const scoreVals = SCORE_CARD_META.map((m) => report.scores[m.key] ?? 0);
  const mx = Math.max(...scoreVals);
  const mn = Math.min(...scoreVals);

  const issuesByCat = new Map<string, number>();
  for (const i of issues) issuesByCat.set(i.category, (issuesByCat.get(i.category) ?? 0) + 1);
  const catBars = [...issuesByCat.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...catBars.map(([, n]) => n));

  // Count issues by the SAME mapping the scoring engine uses (e.g. "Security"
  // and "Code quality" issues deduct from Best practices) — the sub-label must
  // agree with the deduction.
  const issueCountByScoreCat = (key: string) => {
    const n = issues.filter((i) => (CATEGORY_TO_SCORE[i.category] ?? "best-practices") === key).length;
    return n === 1 ? "1 issue found" : `${n} issues found`;
  };

  const failedStages = report.job?.failedStages ?? [];
  const isPartial = report.job?.status === "partial" || failedStages.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1320, margin: "0 auto", animation: "wdfade 0.35s ease" }}>
      {/* Honest partial-results banner: some stages did not run properly */}
      {isPartial ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 12, padding: "12px 16px" }}>
          <MIcon name="error_outline" size={18} color="#F97316" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(253,186,116,0.9)", flex: 1 }}>
            Some stages did not run properly
            {failedStages.length > 0 ? (
              <>
                {": "}
                <b style={{ color: "#FDBA74" }}>{failedStages.map((s) => STAGE_LABELS[s] ?? s).join(", ")}</b>
              </>
            ) : null}
            {" — results on this page are partial, never faked."}
          </span>
          <button onClick={onGoChecks} style={{ border: "1px solid rgba(249,115,22,0.4)", background: "transparent", color: "#FDBA74", borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            Re-run in registry
          </button>
        </div>
      ) : null}

      <div data-wd-hero="1" style={{ display: "grid", gridTemplateColumns: "5fr 4fr 3fr", gap: 18 }}>
        {/* Health ring */}
        <div data-wd-health="1" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "24px 28px", display: "flex", gap: 26, alignItems: "center", backdropFilter: "blur(12px)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.12), transparent 70%)" }} />
          <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
            <svg width="150" height="150" viewBox="0 0 150 150">
              <circle cx="75" cy="75" r="62" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11" />
              <circle
                cx="75"
                cy="75"
                r="62"
                fill="none"
                stroke={hm.color}
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${((ringC * health) / 100).toFixed(1)} ${ringC.toFixed(1)}`}
                transform="rotate(-90 75 75)"
                style={{ filter: `drop-shadow(0 0 8px ${hm.glow})` }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{health}</span>
              <span style={{ fontSize: 11, color: "rgba(231,236,244,0.5)" }}>of 100</span>
            </div>
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(231,236,244,0.45)" }}>Website health</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, letterSpacing: -0.5, color: hm.color }}>{hm.label}</div>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(231,236,244,0.6)", lineHeight: 1.6, textWrap: "pretty" }}>
              {total === 0
                ? "No open issues found on the last scan."
                : `${total} issue${total === 1 ? "" : "s"} found across ${report.pages.length} page${report.pages.length === 1 ? "" : "s"} — ${counts.critical} critical, ${counts.high} high.`}
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {(Object.keys(counts) as SeverityKey[]).map((k) => (
                <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: SEV[k].bg, border: `1px solid ${SEV[k].border}`, color: SEV[k].text, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: SEV[k].main, boxShadow: `0 0 8px ${SEV[k].main}` }} />
                  {counts[k]} {SEV[k].label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Score profile radar */}
        <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(231,236,244,0.45)" }}>Score profile</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8, flexWrap: "wrap" }}>
            <svg width="180" height="164" viewBox="30 20 200 176" style={{ flexShrink: 0 }}>
              {radarGrid.map((g, i) => (
                <polygon key={i} points={g} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              ))}
              {radarAxes.map((ax, i) => (
                <line key={i} x1="130" y1="106" x2={ax.x} y2={ax.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              ))}
              <polygon points={radarPoints} fill="rgba(45,212,191,0.14)" stroke="#2DD4BF" strokeWidth="2" style={{ filter: "drop-shadow(0 0 6px rgba(45,212,191,0.5))" }} />
              {radarDots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r="3.2" fill="#5EEAD4" />
              ))}
            </svg>
            <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 7 }}>
              {SCORE_CARD_META.map((m) => {
                const v = report.scores[m.key] ?? 0;
                const tag = v === mn && mn !== mx ? "Lagging" : v === mx && mn !== mx ? "Leading" : null;
                return (
                  <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: scoreColor(v), boxShadow: `0 0 7px ${scoreGlow(v)}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: "rgba(231,236,244,0.7)", flex: 1, whiteSpace: "nowrap" }}>{m.label}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: scoreColor(v) }}>{v}</span>
                    {tag ? (
                      <span style={{ background: tag === "Lagging" ? "rgba(251,113,133,0.1)" : "rgba(52,211,153,0.1)", border: `1px solid ${tag === "Lagging" ? "rgba(251,113,133,0.35)" : "rgba(52,211,153,0.35)"}`, color: tag === "Lagging" ? "#FDA4AF" : "#6EE7B7", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{tag}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Severity donut */}
        <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "20px 24px", display: "flex", flexDirection: "column", backdropFilter: "blur(12px)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(231,236,244,0.45)" }}>Issues by severity</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 14 }}>
            <svg width="122" height="122" viewBox="0 0 120 120">
              {donutSegs.map((dg, i) => (
                <circle key={i} cx="60" cy="60" r="44" fill="none" stroke={dg.color} strokeWidth="14" strokeDasharray={dg.dash} strokeDashoffset={dg.offset} strokeLinecap="round" transform="rotate(-90 60 60)" />
              ))}
              <text x="60" y="58" textAnchor="middle" style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, fill: "#E7ECF4" }}>{total}</text>
              <text x="60" y="77" textAnchor="middle" style={{ fontSize: 10, fill: "rgba(231,236,244,0.5)" }}>issues</text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {(Object.keys(counts) as SeverityKey[]).map((k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: SEV[k].main, boxShadow: `0 0 8px ${SEV[k].main}` }} />
                  <span style={{ color: "rgba(231,236,244,0.55)", width: 54 }}>{SEV[k].label}</span>
                  <span style={{ fontFamily: FONT_MONO, fontWeight: 700 }}>{counts[k]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Score cards */}
      <div data-wd-scores="1" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
        {SCORE_CARD_META.map((m) => {
          const v = report.scores[m.key] ?? 0;
          return (
            <div key={m.key} style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 18, backdropFilter: "blur(8px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MIcon name={m.icon} size={17} color="rgba(231,236,244,0.45)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(231,236,244,0.6)" }}>{m.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 12 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 32, fontWeight: 700, color: scoreColor(v), textShadow: `0 0 20px ${scoreGlow(v)}` }}>{v}</span>
                <span style={{ fontSize: 12, color: "rgba(231,236,244,0.35)" }}>/100</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", marginTop: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${v}%`, background: scoreColor(v), borderRadius: 2, boxShadow: `0 0 8px ${scoreGlow(v)}` }} />
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(231,236,244,0.45)", marginTop: 10 }}>{issueCountByScoreCat(m.key)}</div>
            </div>
          );
        })}
      </div>

      {/* Bottom: top issues + AI summary + category bars */}
      <div data-wd-bottom="1" style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 18, alignItems: "start" }}>
        <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, backdropFilter: "blur(12px)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>Top issues to fix</div>
            <button onClick={onGoIssues} style={{ border: "none", background: "transparent", color: "#5EEAD4", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", fontFamily: "inherit" }}>
              View all {total}
              <MIcon name="arrow_forward" size={16} outlined={false} />
            </button>
          </div>
          {issues.slice(0, 5).map((i) => {
            const sev = SEV[i.severity as SeverityKey] ?? SEV.low;
            return (
              <div key={i.id} onClick={() => onOpenIssue(i.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                <span style={{ display: "inline-flex", alignItems: "center", background: sev.bg, border: `1px solid ${sev.border}`, color: sev.text, borderRadius: 999, padding: "3px 11px", fontSize: 11, fontWeight: 700, width: 62, justifyContent: "center" }}>{sev.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(231,236,244,0.5)", marginTop: 2 }}>
                    {i.category} · {i.pagePath ?? "Site-wide"}
                  </div>
                </div>
                <MIcon name="chevron_right" size={18} color="rgba(231,236,244,0.25)" outlined={false} />
              </div>
            );
          })}
          {issues.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "rgba(231,236,244,0.45)", fontSize: 13 }}>No issues — clean bill of health.</div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "linear-gradient(140deg, rgba(45,212,191,0.08), rgba(59,130,246,0.06) 50%, rgba(167,139,250,0.08))", border: "1px solid rgba(94,234,212,0.2)", borderRadius: 20, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <MIcon name="auto_awesome" size={19} color="#5EEAD4" outlined={false} />
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>AI summary</span>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.7, color: "rgba(231,236,244,0.75)", textWrap: "pretty" }}>
              {report.aiSummary ?? "AI review runs as part of the scan pipeline. Re-scan the site to generate a fresh summary of what matters most."}
            </p>
            <button onClick={onAskAi} style={{ marginTop: 16, border: "1px solid rgba(94,234,212,0.35)", background: "rgba(45,212,191,0.08)", color: "#5EEAD4", borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
              <MIcon name="forum" size={16} />
              Ask about this site
            </button>
          </div>
          <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(231,236,244,0.45)" }}>Issues by category</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
              {catBars.map(([label, count]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "rgba(231,236,244,0.55)", width: 94, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: 7, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count / maxCat) * 100}%`, background: "linear-gradient(90deg, #2DD4BF, #3B82F6)", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, width: 18, textAlign: "right" }}>{count}</span>
                </div>
              ))}
              {catBars.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "rgba(231,236,244,0.45)" }}>No issues to chart.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
