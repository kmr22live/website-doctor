"use client";

/* eslint-disable @next/next/no-img-element */

import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_MONO, scoreSoft } from "@/lib/ui/theme";
import type { SiteReport } from "@/lib/services/report";

export function PagesSection({
  report,
  onPickPage,
}: {
  report: SiteReport;
  onPickPage: (path: string) => void;
}) {
  const pages = report.pages;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1320, margin: "0 auto", animation: "wdfade 0.35s ease" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Page explorer</h2>
        <span style={{ fontSize: 13, color: "rgba(231,236,244,0.5)" }}>
          {pages.length} page{pages.length === 1 ? "" : "s"} crawled · click a page to see its issues
        </span>
      </div>
      <div data-wd-pages="1" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
        {pages.map((pg) => {
          const issueTone =
            pg.issueCount >= 4
              ? { bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.35)", text: "#FDA4AF" }
              : pg.issueCount >= 2
                ? { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", text: "#FCD34D" }
                : { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", text: "#6EE7B7" };
          const minis = [
            ["P", pg.scores["performance"]],
            ["S", pg.scores["seo"]],
            ["A", pg.scores["accessibility"]],
          ] as const;
          return (
            <div
              key={pg.id}
              onClick={() => onPickPage(pg.path)}
              style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, overflow: "hidden", cursor: "pointer", backdropFilter: "blur(8px)" }}
            >
              <div style={{ background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "12px 14px 0" }}>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", borderRadius: "8px 8px 0 0", height: 96, padding: "9px 11px 0", boxSizing: "border-box", overflow: "hidden" }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(251,113,133,0.6)" }} />
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(251,191,36,0.6)" }} />
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(52,211,153,0.6)" }} />
                  </div>
                  {pg.screenshotPath ? (
                    <img
                      src={`/api/artifacts/screenshot?page=${encodeURIComponent(pg.id)}`}
                      alt={`Screenshot of ${pg.path}`}
                      style={{ width: "100%", borderRadius: 4, display: "block", objectFit: "cover", objectPosition: "top", height: 72 }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ height: 72, borderRadius: 4, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MIcon name="web" size={18} color="rgba(231,236,244,0.3)" />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pg.title ?? pg.path}</div>
                  <span style={{ background: issueTone.bg, border: `1px solid ${issueTone.border}`, color: issueTone.text, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 9px", fontFamily: FONT_MONO, flexShrink: 0 }}>{pg.issueCount}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(231,236,244,0.45)", fontFamily: FONT_MONO, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pg.path}</div>
                {minis.some(([, v]) => v != null) ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                    {minis.map(([label, val]) =>
                      val != null ? (
                        <span key={label} style={{ flex: 1, textAlign: "center", background: scoreSoft(val).bg, color: scoreSoft(val).text, borderRadius: 8, padding: "5px 0", fontSize: 11, fontWeight: 700, fontFamily: FONT_MONO }}>
                          {label} {Math.round(val)}
                        </span>
                      ) : null,
                    )}
                  </div>
                ) : null}
                {pg.metrics["lcp"] || pg.metrics["cls"] ? (
                  <div style={{ display: "flex", gap: 14, marginTop: 11, fontSize: 11, color: "rgba(231,236,244,0.45)", fontFamily: FONT_MONO }}>
                    {pg.metrics["lcp"] ? <span>LCP {pg.metrics["lcp"]}</span> : null}
                    {pg.metrics["cls"] ? <span>CLS {pg.metrics["cls"]}</span> : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {pages.length === 0 ? (
        <div style={{ padding: 44, textAlign: "center", color: "rgba(231,236,244,0.45)", fontSize: 14, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16 }}>
          No pages crawled yet — run a scan first.
        </div>
      ) : null}
    </div>
  );
}
