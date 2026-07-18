"use client";

import { useState } from "react";
import { MIcon } from "@/components/wd/MaterialIcon";
import { RegistryLegend } from "@/components/wd/dashboard/RegistryLegend";
import { CSEV, FONT_MONO, FONT_SANS, SELECT_STYLE, SEV, type SeverityKey } from "@/lib/ui/theme";
import type { SiteReport } from "@/lib/services/report";

const SEV_FILTER_OPTIONS = ["All severities", "Critical", "High", "Medium", "Low", "Warning", "Opportunity", "Notice"];
const STATUS_TABS = ["All", "Failed", "Warnings", "Passed", "Errors"];

/** Data-source chips double as re-run buttons for their analyzer stage. */
const DATA_SOURCE_META: Record<string, { icon: string; label: string; rerunStage: string | null }> = {
  "search-console": { icon: "query_stats", label: "Search Console", rerunStage: null },
  tls: { icon: "https", label: "TLS & headers", rerunStage: "security" },
  w3c: { icon: "data_object", label: "W3C validators", rerunStage: null },
  lighthouse: { icon: "speed", label: "Lighthouse", rerunStage: "lighthouse" },
  axe: { icon: "accessibility_new", label: "axe-core", rerunStage: "axe" },
  ai: { icon: "auto_awesome", label: "AI review", rerunStage: "ai" },
  crawler: { icon: "travel_explore", label: "Crawler", rerunStage: "rules" },
};

export function ChecksSection({
  report,
  onOpenIssue,
  onRerun,
  rerunBusy,
}: {
  report: SiteReport;
  onOpenIssue: (id: string) => void;
  /** Re-run one check (checkId) or a whole analyzer stage (stage). */
  onRerun: (target: { checkId?: string; stage?: string }) => void;
  /** Scope label currently re-running (checkId or "stage:<x>"), or null. */
  rerunBusy: string | null;
}) {
  const [q, setQ] = useState("");
  const [sevFilter, setSevFilter] = useState("All severities");
  const [statusTab, setStatusTab] = useState("All");
  const [openCat, setOpenCat] = useState<number>(0);
  // While filters are active, categories auto-expand — this records the ones
  // the user manually collapsed so the accordion still works.
  const [filterCollapsed, setFilterCollapsed] = useState<Record<string, boolean>>({});

  const checks = report.checks;
  const evaluated = checks.filter((c) => c.status !== "not-evaluated");
  const failed = checks.filter((c) => c.status === "fail");
  const warned = checks.filter((c) => c.status === "warning");
  const passed = checks.filter((c) => c.status === "pass");

  const sevCounts: Record<SeverityKey, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of report.issues) {
    const k = i.severity as SeverityKey;
    if (k in sevCounts) sevCounts[k] += 1;
  }

  // Group by category
  const catMap = new Map<string, typeof checks>();
  for (const c of checks) {
    const list = catMap.get(c.category) ?? [];
    list.push(c);
    catMap.set(c.category, list);
  }

  const lq = q.toLowerCase();
  const filtersActive = !!(lq || sevFilter !== "All severities" || statusTab !== "All");

  const sevLabelFor = (c: SiteReport["checks"][number]) =>
    c.status === "fail" && c.issueSeverity
      ? (SEV[c.issueSeverity as SeverityKey]?.label ?? "Low")
      : (CSEV[c.checkClass]?.label ?? "Notice");

  const rowMatches = (c: SiteReport["checks"][number]) =>
    (!lq || c.name.toLowerCase().includes(lq)) &&
    (sevFilter === "All severities" || sevLabelFor(c) === sevFilter) &&
    (statusTab === "All" ||
      (statusTab === "Failed"
        ? c.status === "fail"
        : statusTab === "Warnings"
          ? c.status === "warning"
          : statusTab === "Errors"
            ? c.status === "error"
            : c.status === "pass"));

  const errored = checks.filter((c) => c.status === "error");

  const dataSources = [...new Set(checks.map((c) => c.dataSource))]
    .map((ds) => DATA_SOURCE_META[ds])
    .filter((d): d is { icon: string; label: string; rerunStage: string | null } => !!d);

  const cats = [...catMap.entries()].map(([name, list], ci) => {
    const catFailed = list.filter((c) => c.status === "fail").length;
    const catWarns = list.filter((c) => c.status === "warning").length;
    const catErrors = list.filter((c) => c.status === "error").length;
    const catEval = list.filter((c) => c.status !== "not-evaluated").length;
    const rows = list.filter(rowMatches);
    const expanded = filtersActive ? rows.length > 0 && !filterCollapsed[name] : openCat === ci;
    return { name, ci, list, catFailed, catWarns, catErrors, catEval, rows, expanded, visible: filtersActive ? rows.length > 0 : true };
  });

  const summary = [
    { label: "Passed", value: String(passed.length), color: "#34D399", sub: `of ${evaluated.length} checks run` },
    { label: "Failed", value: String(failed.length), color: "#FB7185", sub: `= ${report.issues.length} issues, same severity` },
    { label: "Warnings", value: String(warned.length), color: "#FBBF24", sub: "advisory — no issues raised" },
    errored.length > 0
      ? { label: "Not run properly", value: String(errored.length), color: "#F97316", sub: "errored during scan — re-run below" }
      : { label: "Categories", value: String(catMap.size), color: "#E7ECF4", sub: "crawl to code review" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1100, margin: "0 auto", animation: "wdfade 0.35s ease" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Check registry</h2>
        <span style={{ fontSize: 13, color: "rgba(231,236,244,0.5)" }}>
          {checks.length} automated checks across {catMap.size} categories — {evaluated.length} run on this scan
        </span>
      </div>

      {dataSources.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {dataSources.map((ds) => {
            const busy = rerunBusy === `stage:${ds.rerunStage}`;
            return (
              <span key={ds.label} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "5px 13px", fontSize: 12, color: "rgba(231,236,244,0.7)", whiteSpace: "nowrap" }}>
                <MIcon name={ds.icon} size={15} color="rgba(231,236,244,0.45)" />
                {ds.label}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#6EE7B7", fontWeight: 600 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34D399" }} />
                  Run
                </span>
                {ds.rerunStage ? (
                  <button
                    onClick={() => onRerun({ stage: ds.rerunStage as string })}
                    disabled={rerunBusy !== null}
                    title={`Re-run ${ds.label}`}
                    style={{ border: "none", background: "transparent", color: busy ? "#5EEAD4" : "rgba(231,236,244,0.5)", cursor: rerunBusy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", padding: 0, marginLeft: 2 }}
                  >
                    <MIcon name="restart_alt" size={15} style={busy ? { animation: "wdspin 1.2s linear infinite", display: "inline-block" } : undefined} />
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}

      <div data-wd-stats="1" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {summary.map((cs) => (
          <div key={cs.label} style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "14px 18px", backdropFilter: "blur(8px)" }}>
            <div style={{ fontSize: 12, color: "rgba(231,236,244,0.5)" }}>{cs.label}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 26, fontWeight: 700, marginTop: 4, color: cs.color }}>{cs.value}</div>
            <div style={{ fontSize: 11, color: "rgba(231,236,244,0.45)", marginTop: 3 }}>{cs.sub}</div>
          </div>
        ))}
      </div>

      {/* Reconciliation banner (core invariant) */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 12, padding: "12px 16px" }}>
        <MIcon name="info" size={17} color="#7DD3FC" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(231,236,244,0.7)" }}>
          Every failed check opens exactly one issue with the same severity —{" "}
          <b style={{ color: "#E7ECF4" }}>
            {failed.length} failed checks = {report.issues.length} issues ({sevCounts.critical} critical · {sevCounts.high} high · {sevCounts.medium} medium · {sevCounts.low} low)
          </b>
          , identical wherever counts appear. Warnings are advisory and never create issues.
        </span>
      </div>

      {/* Legend: how to read statuses, chips, categories */}
      <RegistryLegend categories={[...catMap.keys()]} />

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div data-wd-search="1" style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "0 16px", width: 250 }}>
          <MIcon name="search" size={18} color="rgba(231,236,244,0.4)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${checks.length} checks`} style={{ flex: 1, border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, padding: "9px 0", background: "transparent", color: "#E7ECF4", minWidth: 0 }} />
        </div>
        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} style={SELECT_STYLE}>
          {SEV_FILTER_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: 3, gap: 2 }}>
          {STATUS_TABS.map((label) => (
            <button
              key={label}
              onClick={() => setStatusTab(label)}
              style={{ border: "none", background: statusTab === label ? "linear-gradient(120deg, rgba(45,212,191,0.25), rgba(59,130,246,0.25))" : "transparent", color: statusTab === label ? "#5EEAD4" : "rgba(231,236,244,0.55)", borderRadius: 999, padding: "6px 14px", fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cats
          .filter((c) => c.visible)
          .map((cc) => (
            <div key={cc.name} style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, backdropFilter: "blur(8px)", overflow: "hidden" }}>
              <div
                onClick={() =>
                  filtersActive
                    ? setFilterCollapsed((fc) => ({ ...fc, [cc.name]: !fc[cc.name] }))
                    : setOpenCat(openCat === cc.ci ? -1 : cc.ci)
                }
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer" }}
              >
                <MIcon name={cc.expanded ? "expand_less" : "expand_more"} size={20} color="rgba(231,236,244,0.4)" outlined={false} />
                <span style={{ fontSize: 14.5, fontWeight: 700, flexShrink: 0 }}>{cc.name}</span>
                {cc.catFailed > 0 ? (
                  <span style={{ background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.35)", color: "#FDA4AF", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{cc.catFailed} failed</span>
                ) : null}
                {cc.catWarns > 0 ? (
                  <span style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.35)", color: "#FCD34D", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {cc.catWarns} {cc.catWarns === 1 ? "warning" : "warnings"}
                  </span>
                ) : null}
                {cc.catErrors > 0 ? (
                  <span style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.35)", color: "#FDBA74", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {cc.catErrors} not run
                  </span>
                ) : null}
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: "rgba(231,236,244,0.5)", whiteSpace: "nowrap" }}>
                  {cc.list.length - cc.catFailed - cc.catWarns}/{cc.list.length} passed
                </span>
                <div style={{ width: 90, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden", flexShrink: 0 }}>
                  <div style={{ height: "100%", width: `${Math.round(((cc.list.length - cc.catFailed) / Math.max(1, cc.list.length)) * 100)}%`, background: cc.catFailed > 0 ? "#FB7185" : cc.catWarns > 0 ? "#FBBF24" : "#34D399", borderRadius: 3 }} />
                </div>
              </div>
              {cc.expanded ? (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {cc.rows.map((cr, rowIdx) => {
                    const failMeta = cr.status === "fail" && cr.issueSeverity ? SEV[cr.issueSeverity as SeverityKey] : null;
                    const classMeta = CSEV[cr.checkClass] ?? CSEV.notice;
                    const isError = cr.status === "error";
                    const label = isError ? "Not run — error" : failMeta ? failMeta.label : classMeta.label;
                    const color = isError ? "#FDBA74" : failMeta ? failMeta.text : classMeta.color;
                    const bg = isError ? "rgba(249,115,22,0.1)" : failMeta ? failMeta.bg : classMeta.bg;
                    const border = isError ? "rgba(249,115,22,0.35)" : failMeta ? failMeta.border : classMeta.border;
                    const notEval = cr.status === "not-evaluated";
                    const busy = rerunBusy === cr.checkId;
                    return (
                      <div
                        key={`${cr.checkId}-${rowIdx}`}
                        onClick={() => cr.issueId && onOpenIssue(cr.issueId)}
                        title={isError && cr.evidence ? cr.evidence : undefined}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 20px 9px 54px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: cr.issueId ? "pointer" : "default" }}
                      >
                        <MIcon
                          name={cr.status === "fail" ? "cancel" : cr.status === "warning" ? "error" : isError ? "error_outline" : notEval ? "remove_circle_outline" : "check_circle"}
                          size={16}
                          color={cr.status === "fail" ? "#FB7185" : cr.status === "warning" ? "#FBBF24" : isError ? "#F97316" : notEval ? "rgba(231,236,244,0.25)" : "rgba(52,211,153,0.75)"}
                          outlined={!(["fail", "warning", "pass"].includes(cr.status))}
                          style={{ flexShrink: 0 }}
                        />
                        <span style={{ flex: 1, fontSize: 13, color: cr.status === "fail" ? "#E7ECF4" : isError ? "rgba(253,186,116,0.9)" : cr.status === "warning" ? "rgba(231,236,244,0.85)" : notEval ? "rgba(231,236,244,0.35)" : "rgba(231,236,244,0.55)", minWidth: 0 }}>
                          {cr.name}
                          {cr.pagePath ? <span style={{ marginLeft: 8, fontSize: 10.5, color: "rgba(231,236,244,0.35)", fontFamily: FONT_MONO }}>{cr.pagePath}</span> : null}
                          {notEval ? (
                            <span style={{ marginLeft: 8, fontSize: 10.5, color: "rgba(231,236,244,0.3)", fontFamily: FONT_MONO }}>
                              {cr.implemented ? "N/A" : "N/A — not implemented"}
                            </span>
                          ) : null}
                          {isError && cr.evidence ? (
                            <span style={{ marginLeft: 8, fontSize: 10.5, color: "rgba(249,115,22,0.7)", fontFamily: FONT_MONO }}>
                              {cr.evidence.slice(0, 80)}
                            </span>
                          ) : null}
                        </span>
                        <span style={{ background: bg, border: `1px solid ${border}`, color, borderRadius: 999, padding: "1px 9px", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
                        {cr.implemented ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRerun({ checkId: cr.checkId });
                            }}
                            disabled={rerunBusy !== null}
                            title={`Re-run "${cr.name}" only`}
                            style={{ border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: busy ? "#5EEAD4" : "rgba(231,236,244,0.45)", borderRadius: 999, width: 24, height: 24, cursor: rerunBusy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}
                          >
                            <MIcon name="restart_alt" size={13} style={busy ? { animation: "wdspin 1.2s linear infinite", display: "inline-block" } : undefined} />
                          </button>
                        ) : null}
                        {cr.issueId ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#5EEAD4", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                            View issue
                            <MIcon name="chevron_right" size={14} outlined={false} />
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        {cats.filter((c) => c.visible).length === 0 ? (
          <div style={{ padding: 44, textAlign: "center", color: "rgba(231,236,244,0.45)", fontSize: 14, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16 }}>
            {checks.length === 0 ? "No checks recorded yet — run a scan first." : "No checks match the current filters."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
