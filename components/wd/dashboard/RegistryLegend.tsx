"use client";

import { useSyncExternalStore } from "react";
import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_MONO } from "@/lib/ui/theme";

const LS_KEY = "wd-legend-open";
const EVT = "wd-legend-toggle";

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
}

function readOpen(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === "1";
  } catch {
    return false;
  }
}

const chip = (bg: string, border: string, color: string): React.CSSProperties => ({
  background: bg,
  border: `1px solid ${border}`,
  color,
  borderRadius: 999,
  padding: "2px 10px",
  fontSize: 10.5,
  fontWeight: 700,
  whiteSpace: "nowrap",
  display: "inline-block",
});

const STATUS_CARDS: { icon: string; outlined: boolean; iconColor: string; title: string; desc: React.ReactNode; border: string }[] = [
  {
    icon: "check_circle",
    outlined: false,
    iconColor: "rgba(52,211,153,0.85)",
    title: "Pass",
    desc: "Check ran — the page is clean.",
    border: "rgba(255,255,255,0.07)",
  },
  {
    icon: "cancel",
    outlined: false,
    iconColor: "#FB7185",
    title: "Fail",
    desc: (
      <>
        Real problem found → opens exactly <b style={{ color: "#FDA4AF" }}>1 issue</b>, same severity. Deducts score.
      </>
    ),
    border: "rgba(251,113,133,0.25)",
  },
  {
    icon: "error",
    outlined: false,
    iconColor: "#FBBF24",
    title: "Warning",
    desc: "Borderline — advisory only. Never an issue, never hurts score.",
    border: "rgba(255,255,255,0.07)",
  },
  {
    icon: "error_outline",
    outlined: true,
    iconColor: "#F97316",
    title: "Not run — error",
    desc: "Check crashed / tool couldn't measure. Never faked — use ↻ to re-run.",
    border: "rgba(249,115,22,0.25)",
  },
  {
    icon: "remove_circle_outline",
    outlined: true,
    iconColor: "rgba(231,236,244,0.3)",
    title: "N/A",
    desc: "Not evaluated on this scan, or rule not implemented yet.",
    border: "rgba(255,255,255,0.07)",
  },
];

const label: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "rgba(231,236,244,0.4)",
  marginBottom: 8,
};

/** "How to read this registry" — status icons, severity chips, categories. */
export function RegistryLegend({ categories }: { categories: string[] }) {
  // localStorage-backed, SSR-safe (server renders collapsed).
  const open = useSyncExternalStore(subscribe, readOpen, () => false);

  function toggle() {
    try {
      localStorage.setItem(LS_KEY, open ? "0" : "1");
    } catch {
      // storage unavailable — toggle is view-only then
    }
    window.dispatchEvent(new Event(EVT));
  }

  const catPreview = categories.slice(0, 7).join(" · ");

  return (
    <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", cursor: "pointer" }}>
        <MIcon name="help_outline" size={17} color="#5EEAD4" />
        <span style={{ fontSize: 13, fontWeight: 700 }}>How to read this registry</span>
        <span style={{ fontSize: 11.5, color: "rgba(231,236,244,0.45)" }}>status icons · severity chips · categories</span>
        <span style={{ flex: 1 }} />
        <MIcon name={open ? "expand_less" : "expand_more"} size={20} color="rgba(231,236,244,0.4)" outlined={false} />
      </div>

      {open ? (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Result statuses */}
          <div>
            <div style={label}>Result of each check on this scan</div>
            <div data-wd-steps="1" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {STATUS_CARDS.map((s) => (
                <div key={s.title} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${s.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700 }}>
                    <MIcon name={s.icon} size={16} color={s.iconColor} outlined={s.outlined} />
                    {s.title}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(231,236,244,0.5)", lineHeight: 1.5, marginTop: 5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chip meanings */}
          <div data-wd-stats="1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={label}>Chip on a failed check = issue severity</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={chip("rgba(251,113,133,0.1)", "rgba(251,113,133,0.35)", "#FDA4AF")}>Critical</span>
                <span style={chip("rgba(251,191,36,0.1)", "rgba(251,191,36,0.35)", "#FCD34D")}>High</span>
                <span style={chip("rgba(56,189,248,0.1)", "rgba(56,189,248,0.35)", "#7DD3FC")}>Medium</span>
                <span style={chip("rgba(148,163,184,0.1)", "rgba(148,163,184,0.3)", "#CBD5E1")}>Low</span>
                <span style={{ fontSize: 11, color: "rgba(231,236,244,0.45)", marginLeft: 4 }}>→ how urgent the opened issue is</span>
              </div>
            </div>
            <div>
              <div style={label}>Chip on other rows = check class</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={chip("rgba(251,113,133,0.1)", "rgba(251,113,133,0.35)", "#FDA4AF")}>Critical</span>
                <span style={chip("rgba(251,191,36,0.1)", "rgba(251,191,36,0.35)", "#FCD34D")}>Warning</span>
                <span style={chip("rgba(56,189,248,0.1)", "rgba(56,189,248,0.35)", "#7DD3FC")}>Opportunity</span>
                <span style={chip("rgba(148,163,184,0.1)", "rgba(148,163,184,0.3)", "#CBD5E1")}>Notice</span>
                <span style={{ fontSize: 11, color: "rgba(231,236,244,0.45)", marginLeft: 4 }}>→ how important the check itself is</span>
              </div>
            </div>
          </div>

          {/* Categories + row extras */}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 340 }}>
              <div style={label}>Categories = the accordion groups below</div>
              <div style={{ fontSize: 11.5, color: "rgba(231,236,244,0.55)", lineHeight: 1.7 }}>
                Checks are grouped by what they audit — <span style={{ color: "#E7ECF4" }}>{catPreview}</span>
                {categories.length > 7 ? " …" : ""} Each group header shows{" "}
                <span style={chip("rgba(251,113,133,0.1)", "rgba(251,113,133,0.35)", "#FDA4AF")}>2 failed</span>{" "}
                <span style={chip("rgba(251,191,36,0.1)", "rgba(251,191,36,0.35)", "#FCD34D")}>1 warning</span>{" "}
                <span style={chip("rgba(249,115,22,0.1)", "rgba(249,115,22,0.35)", "#FDBA74")}>1 not run</span> counts and a pass bar.
              </div>
            </div>
            <div style={{ minWidth: 250 }}>
              <div style={label}>Row extras</div>
              <div style={{ fontSize: 11.5, color: "rgba(231,236,244,0.55)", lineHeight: 1.9 }}>
                <span style={{ fontFamily: FONT_MONO, color: "rgba(231,236,244,0.4)", fontSize: 11 }}>/pricing</span>&nbsp; which page this result is for
                <br />
                <span style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", verticalAlign: "middle" }}>
                  <MIcon name="restart_alt" size={11} color="rgba(231,236,244,0.5)" />
                </span>
                &nbsp; re-run just this check
                <br />
                <span style={{ color: "#5EEAD4", fontSize: 12, fontWeight: 600 }}>View issue ›</span>&nbsp; open the fix card for a failed check
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
