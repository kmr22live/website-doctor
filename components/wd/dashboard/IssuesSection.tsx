"use client";

import { useState } from "react";
import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_MONO, FONT_SANS, SELECT_STYLE, SEV, SEV_ORDER, type SeverityKey } from "@/lib/ui/theme";
import type { SiteReport } from "@/lib/services/report";

const CAT_OPTIONS = ["All categories", "SEO", "Accessibility", "Performance", "Security", "Code quality", "UX", "Conversion", "Content", "Forms", "Tracking", "Navigation"];
const SEV_OPTIONS = ["All severities", "Critical", "High", "Medium", "Low"];

export function IssuesSection({
  report,
  onOpenIssue,
  initialQuery = "",
}: {
  report: SiteReport;
  onOpenIssue: (id: string) => void;
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState("All categories");
  const [sev, setSev] = useState("All severities");
  const [statusTab, setStatusTab] = useState(0);

  const open = report.issues.filter((i) => i.status === "open").length;
  const total = report.issues.length;

  const lq = q.toLowerCase();
  const filtered = report.issues
    .filter(
      (i) =>
        (!lq || `${i.title} ${i.pagePath ?? ""} ${i.category} ${i.description}`.toLowerCase().includes(lq)) &&
        (cat === "All categories" || i.category === cat) &&
        (sev === "All severities" || (SEV[i.severity as SeverityKey]?.label ?? "") === sev) &&
        (statusTab === 0 || (statusTab === 1 ? i.status === "open" : i.status === "resolved")),
    )
    .sort((a, b) => (SEV_ORDER[a.severity as SeverityKey] ?? 4) - (SEV_ORDER[b.severity as SeverityKey] ?? 4));

  const hasFilters = !!(q || cat !== "All categories" || sev !== "All severities");
  const selectStyle = SELECT_STYLE;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1320, margin: "0 auto", animation: "wdfade 0.35s ease" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Issues</h2>
        <span style={{ fontSize: 13, color: "rgba(231,236,244,0.5)" }}>
          {open} open · {total - open} resolved · one issue per failed check, severities match the registry
        </span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, backdropFilter: "blur(12px)", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 12, padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", alignItems: "center", flexWrap: "wrap" }}>
          <div data-wd-search="1" style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "0 16px", width: 250 }}>
            <MIcon name="search" size={18} color="rgba(231,236,244,0.4)" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search issues" style={{ flex: 1, border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, padding: "9px 0", background: "transparent", color: "#E7ECF4", minWidth: 0 }} />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={selectStyle}>
            {CAT_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={sev} onChange={(e) => setSev(e.target.value)} style={selectStyle}>
            {SEV_OPTIONS.map((sv) => (
              <option key={sv} value={sv}>{sv}</option>
            ))}
          </select>
          {hasFilters ? (
            <button
              onClick={() => {
                setQ("");
                setCat("All categories");
                setSev("All severities");
                setStatusTab(0);
              }}
              style={{ border: "none", background: "transparent", color: "rgba(231,236,244,0.55)", fontFamily: FONT_SANS, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 4 }}
            >
              <MIcon name="close" size={15} outlined={false} />
              Clear
            </button>
          ) : null}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: 3, gap: 2 }}>
            {["All", "Open", "Resolved"].map((label, i) => (
              <button
                key={label}
                onClick={() => setStatusTab(i)}
                style={{ border: "none", background: statusTab === i ? "linear-gradient(120deg, rgba(45,212,191,0.25), rgba(59,130,246,0.25))" : "transparent", color: statusTab === i ? "#5EEAD4" : "rgba(231,236,244,0.55)", borderRadius: 999, padding: "6px 16px", fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div data-wd-issuerow="1" style={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr) 140px 116px 96px 36px", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(231,236,244,0.4)" }}>
          <span>Severity</span>
          <span>Issue</span>
          <span data-wd-hidecol="1">Page</span>
          <span data-wd-hidecol="1">Category</span>
          <span data-wd-hidecol2="1">Status</span>
          <span />
        </div>
        {filtered.map((i) => {
          const s = SEV[i.severity as SeverityKey] ?? SEV.low;
          const resolved = i.status === "resolved";
          return (
            <div
              key={i.id}
              data-wd-issuerow="1"
              onClick={() => onOpenIssue(i.id)}
              style={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr) 140px 116px 96px 36px", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center", cursor: "pointer", opacity: resolved ? 0.45 : 1 }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, justifyContent: "center" }}>{s.label}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.title}</div>
                <div style={{ fontSize: 12, color: "rgba(231,236,244,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{i.description}</div>
              </div>
              <span data-wd-hidecol="1" style={{ fontSize: 12, color: "rgba(231,236,244,0.55)", fontFamily: FONT_MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.pagePath ?? "Site-wide"}</span>
              <span data-wd-hidecol="1" style={{ fontSize: 13, color: "rgba(231,236,244,0.55)" }}>{i.category}</span>
              <span data-wd-hidecol2="1" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: resolved ? "#34D399" : "rgba(231,236,244,0.5)" }}>
                <MIcon name={resolved ? "check_circle" : "radio_button_unchecked"} size={15} outlined={false} />
                {resolved ? "Resolved" : "Open"}
              </span>
              <MIcon name="chevron_right" size={18} color="rgba(231,236,244,0.25)" outlined={false} style={{ justifySelf: "end" }} />
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <div style={{ padding: 44, textAlign: "center", color: "rgba(231,236,244,0.45)", fontSize: 14 }}>No issues match the current filters.</div>
        ) : null}
      </div>
    </div>
  );
}
