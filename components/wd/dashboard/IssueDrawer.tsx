"use client";

import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_MONO, FONT_SANS, SEV, type SeverityKey } from "@/lib/ui/theme";
import type { ReportIssue } from "@/lib/services/report";

export function IssueDrawer({
  issue,
  onClose,
  onToggleResolved,
  onCopied,
}: {
  issue: ReportIssue;
  onClose: () => void;
  onToggleResolved: () => void;
  onCopied: () => void;
}) {
  const s = SEV[issue.severity as SeverityKey] ?? SEV.low;
  const isRes = issue.status === "resolved";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,4,9,0.7)", backdropFilter: "blur(3px)", zIndex: 40 }} />
      <div data-wd-drawer="1" style={{ position: "fixed", top: 12, right: 12, bottom: 12, width: 490, background: "rgba(13,18,32,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, zIndex: 41, boxShadow: "0 40px 120px rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", animation: "wdslide 0.28s ease", overflow: "hidden" }}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
              <span style={{ display: "inline-flex", background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 999, padding: "3px 11px", fontSize: 11, fontWeight: 700 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: "rgba(231,236,244,0.5)", fontFamily: FONT_MONO }}>
                {issue.category} · {issue.pagePath ?? "Site-wide"}
              </span>
            </div>
            <h3 style={{ margin: "12px 0 0", fontSize: 19, fontWeight: 700, lineHeight: 1.35, letterSpacing: -0.3 }}>{issue.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(231,236,244,0.6)", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MIcon name="close" size={18} outlined={false} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px", display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(231,236,244,0.4)" }}>What we found</div>
            <p style={{ margin: "9px 0 0", fontSize: 13.5, lineHeight: 1.7, color: "rgba(231,236,244,0.8)", textWrap: "pretty" }}>{issue.description}</p>
          </div>
          {issue.affected.length > 0 ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MIcon name="code" size={17} color="#7DD3FC" />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(231,236,244,0.4)" }}>
                  Affected elements ({issue.affected.length})
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => {
                    const text = issue.affected.map((a) => a.html).join("\n\n");
                    if (navigator.clipboard) void navigator.clipboard.writeText(text);
                    onCopied();
                  }}
                  title="Copy all affected elements"
                  style={{ border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(231,236,244,0.55)", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_SANS }}
                >
                  <MIcon name="content_copy" size={12} />
                  Copy
                </button>
              </div>
              <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 8 }}>
                {issue.affected.map((a, i) => (
                  <div key={i} style={{ background: "rgba(2,4,9,0.8)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 12, overflow: "hidden" }}>
                    {a.selector ? (
                      <div style={{ padding: "7px 14px 0", fontFamily: FONT_MONO, fontSize: 10.5, color: "rgba(125,211,252,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.selector}</div>
                    ) : null}
                    <pre style={{ margin: 0, padding: "8px 14px 12px", color: "rgba(231,236,244,0.75)", fontFamily: FONT_MONO, fontSize: 11.5, lineHeight: 1.65, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{a.html}</pre>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 7, fontSize: 11, color: "rgba(231,236,244,0.4)" }}>
                Real HTML captured from the scanned page — search for it in your codebase to locate the element.
              </div>
            </div>
          ) : null}
          {issue.businessImpact ? (
            <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MIcon name="trending_down" size={17} color="#FBBF24" />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "#FCD34D" }}>Business impact</span>
              </div>
              <p style={{ margin: "9px 0 0", fontSize: 13, lineHeight: 1.65, color: "rgba(252,211,77,0.85)", textWrap: "pretty" }}>{issue.businessImpact}</p>
            </div>
          ) : null}
          {issue.fix ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MIcon name="auto_fix_high" size={17} color="#5EEAD4" outlined={false} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(231,236,244,0.4)" }}>Recommended fix</span>
              </div>
              <p style={{ margin: "9px 0 0", fontSize: 13.5, lineHeight: 1.7, color: "rgba(231,236,244,0.8)", textWrap: "pretty" }}>{issue.fix}</p>
              {issue.code ? (
                <pre style={{ margin: "12px 0 0", background: "rgba(2,4,9,0.8)", border: "1px solid rgba(94,234,212,0.15)", color: "#99F6E4", borderRadius: 12, padding: "16px 18px", fontFamily: FONT_MONO, fontSize: 12, lineHeight: 1.75, overflowX: "auto", whiteSpace: "pre" }}>{issue.code}</pre>
              ) : null}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 18, fontSize: 12, color: "rgba(231,236,244,0.5)" }}>
            {issue.effort ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <MIcon name="construction" size={16} />
                Effort: {issue.effort.charAt(0).toUpperCase() + issue.effort.slice(1)}
              </span>
            ) : null}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO }}>
              <MIcon name="rule" size={16} />
              {issue.sourceCheckId}
            </span>
          </div>
        </div>
        <div style={{ padding: "16px 26px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10 }}>
          {issue.code ? (
            <button
              onClick={() => {
                if (issue.code && navigator.clipboard) void navigator.clipboard.writeText(issue.code);
                onCopied();
              }}
              style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(231,236,244,0.8)", borderRadius: 999, padding: "9px 18px", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
            >
              <MIcon name="content_copy" size={16} />
              Copy fix
            </button>
          ) : null}
          <div style={{ flex: 1 }} />
          <button
            onClick={onToggleResolved}
            style={{ border: "none", background: isRes ? "rgba(255,255,255,0.1)" : "linear-gradient(120deg, #34D399, #2DD4BF)", color: isRes ? "#E7ECF4" : "#04110D", borderRadius: 999, padding: "10px 22px", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: isRes ? "none" : "0 6px 20px rgba(52,211,153,0.3)" }}
          >
            <MIcon name={isRes ? "undo" : "check"} size={16} outlined={false} />
            {isRes ? "Reopen issue" : "Mark resolved"}
          </button>
        </div>
      </div>
    </>
  );
}
