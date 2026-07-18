/**
 * Shared UI constants + helpers lifted 1:1 from the design contract
 * (design/prototype-source.html). Used by views and the PDF report.
 */

export type SeverityKey = "critical" | "high" | "medium" | "low";

export const SEV: Record<
  SeverityKey,
  { label: string; main: string; bg: string; border: string; text: string }
> = {
  critical: {
    label: "Critical",
    main: "#FB7185",
    bg: "rgba(251,113,133,0.1)",
    border: "rgba(251,113,133,0.35)",
    text: "#FDA4AF",
  },
  high: {
    label: "High",
    main: "#FBBF24",
    bg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.35)",
    text: "#FCD34D",
  },
  medium: {
    label: "Medium",
    main: "#38BDF8",
    bg: "rgba(56,189,248,0.1)",
    border: "rgba(56,189,248,0.35)",
    text: "#7DD3FC",
  },
  low: {
    label: "Low",
    main: "#94A3B8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.3)",
    text: "#CBD5E1",
  },
};

export const SEV_ORDER: Record<SeverityKey, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Check-class severity chips for passing registry rows. */
export const CSEV: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  critical: { label: "Critical", color: "#FDA4AF", bg: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.35)" },
  warning: { label: "Warning", color: "#FCD34D", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.35)" },
  opportunity: { label: "Opportunity", color: "#7DD3FC", bg: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.35)" },
  notice: { label: "Notice", color: "#CBD5E1", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" },
};

export function healthMeta(h: number) {
  return h >= 75
    ? { label: "Good shape", color: "#34D399", glow: "rgba(52,211,153,0.5)", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.3)", text: "#6EE7B7" }
    : h >= 60
      ? { label: "Needs attention", color: "#FBBF24", glow: "rgba(251,191,36,0.5)", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)", text: "#FCD34D" }
      : { label: "At risk", color: "#FB7185", glow: "rgba(251,113,133,0.5)", bg: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.3)", text: "#FDA4AF" };
}

export function scoreColor(v: number) {
  return v >= 75 ? "#34D399" : v >= 60 ? "#FBBF24" : "#FB7185";
}
export function scoreGlow(v: number) {
  return v >= 75 ? "rgba(52,211,153,0.4)" : v >= 60 ? "rgba(251,191,36,0.4)" : "rgba(251,113,133,0.4)";
}
export function scoreSoft(v: number) {
  return v >= 75
    ? { bg: "rgba(52,211,153,0.1)", text: "#6EE7B7" }
    : v >= 60
      ? { bg: "rgba(251,191,36,0.1)", text: "#FCD34D" }
      : { bg: "rgba(251,113,133,0.1)", text: "#FDA4AF" };
}

export const SCORE_CARD_META: { key: string; label: string; icon: string }[] = [
  { key: "seo", label: "SEO", icon: "search" },
  { key: "accessibility", label: "Accessibility", icon: "accessibility_new" },
  { key: "performance", label: "Performance", icon: "speed" },
  { key: "ux", label: "UX", icon: "palette" },
  { key: "conversion", label: "Conversion", icon: "trending_up" },
  { key: "best-practices", label: "Best practices", icon: "verified" },
];

export const FONT_MONO = "'JetBrains Mono', monospace";
export const FONT_SANS = "'Space Grotesk', sans-serif";

/** Shared pill <select> style — custom chevron inset from the edge. */
export const SELECT_STYLE: import("react").CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  padding: "9px 38px 9px 16px",
  fontFamily: FONT_SANS,
  fontSize: 13,
  color: "#E7ECF4",
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  backgroundSize: "14px",
};
