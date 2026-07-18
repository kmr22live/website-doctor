"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Background } from "@/components/wd/Background";
import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_MONO, FONT_SANS } from "@/lib/ui/theme";

const START_STEPS = [
  { num: "01", icon: "travel_explore", title: "Crawl", sub: "Up to 10 pages, screenshots and HTML captured", tint: "#5EEAD4" },
  { num: "02", icon: "rule", title: "331 checks", sub: "19 categories: SEO, crawl, code, a11y, headers, security", tint: "#60A5FA" },
  { num: "03", icon: "visibility", title: "AI review", sub: "Vision + HTML review of every page, cross-page too", tint: "#A78BFA" },
  { num: "04", icon: "auto_fix_high", title: "Fixes", sub: "Prioritized issues with ready-to-paste code", tint: "#F472B6" },
];

const TICKER = [
  "seo/title-unique", "a11y/contrast", "perf/oversized-images", "seo/meta-description",
  "a11y/image-alt", "forms/required", "nav/broken-links", "perf/lazy-loading",
  "seo/open-graph", "track/ga4-coverage", "content/placeholder", "a11y/focus-visible",
  "perf/render-blocking", "seo/sitemap", "ai/cross-page", "a11y/label",
];

const SAMPLES = ["https://example.com", "https://books.toscrape.com"];

export default function StartPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(target: string) {
    const t = target.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: t }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Failed to start analysis");
      router.push(`/analyzing/${data.jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start analysis");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", fontFamily: FONT_SANS, color: "#E7ECF4", fontSize: 14, position: "relative" }}>
      <Background />
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box", position: "relative" }}>
        <button
          data-wd-backbtn="1"
          onClick={() => router.push("/projects")}
          style={{ position: "absolute", top: 20, left: 24, zIndex: 2, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)", color: "rgba(231,236,244,0.7)", borderRadius: 999, padding: "8px 16px", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <MIcon name="arrow_back" size={16} outlined={false} />
          All projects
        </button>
        <div style={{ flex: 1, width: "100%", maxWidth: 860, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", boxSizing: "border-box", animation: "wdfade 0.5s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: "linear-gradient(135deg, #2DD4BF, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(45,212,191,0.4)" }}>
              <MIcon name="medical_services" size={30} color="#04110D" outlined={false} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: -0.5, lineHeight: 1.15 }}>Website Doctor</div>
              <div style={{ fontSize: 11.5, color: "rgba(231,236,244,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>AI website diagnosis</div>
            </div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(94,234,212,0.25)", background: "rgba(45,212,191,0.08)", borderRadius: 999, padding: "6px 16px", fontSize: 12, letterSpacing: 2.5, fontWeight: 600, color: "#5EEAD4" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2DD4BF", animation: "wdblink 1.6s infinite" }} />
            AI-POWERED WEBSITE QA
          </div>
          <h1 data-wd-h1="1" style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, margin: "28px 0 0", textAlign: "center" }}>
            Your website,
            <br />
            <span style={{ background: "linear-gradient(100deg, #2DD4BF 10%, #60A5FA 55%, #A78BFA 95%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              diagnosed in minutes.
            </span>
          </h1>
          <p style={{ margin: "20px 0 0", color: "rgba(231,236,244,0.6)", fontSize: 17, lineHeight: 1.6, textAlign: "center", maxWidth: 540, textWrap: "pretty" }}>
            We crawl every page, run all 331 gold-standard QC checks — crawl, SEO, code, accessibility, security, speed — and let AI review each screen like a senior designer — then hand you fixes you can paste in.
          </p>
          <div data-wd-urlbar="1" style={{ display: "flex", gap: 10, width: "100%", maxWidth: 680, marginTop: 40, padding: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, backdropFilter: "blur(12px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)", alignItems: "center" }}>
            <MIcon name="language" size={22} color="rgba(231,236,244,0.4)" style={{ marginLeft: 16 }} />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void analyze(url);
              }}
              placeholder="https://yourwebsite.com"
              style={{ flex: 1, border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 17, padding: "12px 0", background: "transparent", color: "#E7ECF4", minWidth: 0 }}
            />
            <button
              onClick={() => void analyze(url)}
              disabled={busy}
              style={{ border: "none", cursor: busy ? "wait" : "pointer", fontFamily: FONT_SANS, fontSize: 15, fontWeight: 700, color: "#04110D", background: "linear-gradient(120deg, #2DD4BF, #3B82F6)", borderRadius: 999, padding: "14px 30px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 28px rgba(45,212,191,0.3)", opacity: busy ? 0.7 : 1 }}
            >
              <MIcon name={busy ? "hourglass_top" : "troubleshoot"} size={19} outlined={false} />
              {busy ? "Starting…" : "Run diagnosis"}
            </button>
          </div>
          {error ? (
            <div style={{ marginTop: 14, color: "#FDA4AF", fontSize: 13, fontFamily: FONT_MONO }}>{error}</div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 18, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: "rgba(231,236,244,0.4)" }}>Try:</span>
            {SAMPLES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setUrl(s);
                  void analyze(s);
                }}
                style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", borderRadius: 999, padding: "5px 14px", fontFamily: FONT_MONO, fontSize: 12, color: "rgba(231,236,244,0.65)", cursor: "pointer" }}
              >
                {s.replace(/^https?:\/\//, "")}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, width: "100%", maxWidth: 820, marginTop: 64 }} data-wd-steps="1">
            {START_STEPS.map((st) => (
              <div key={st.num} style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 18px", backdropFilter: "blur(8px)", position: "relative", overflow: "hidden" }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "rgba(231,236,244,0.35)", letterSpacing: 1 }}>{st.num}</div>
                <MIcon name={st.icon} size={26} color={st.tint} style={{ marginTop: 12 }} />
                <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 10 }}>{st.title}</div>
                <div style={{ fontSize: 12.5, color: "rgba(231,236,244,0.55)", lineHeight: 1.55, marginTop: 5 }}>{st.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: "100%", marginTop: 32, overflow: "hidden", padding: "18px 0", borderTop: "1px solid rgba(255,255,255,0.06)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)" }}>
          <div style={{ display: "flex", gap: 36, width: "max-content", animation: "wdmarquee 36s linear infinite" }}>
            {[...TICKER, ...TICKER].map((tk, i) => (
              <span key={i} style={{ fontFamily: FONT_MONO, fontSize: 12, color: "rgba(231,236,244,0.3)", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "rgba(45,212,191,0.5)" }}>✓</span>
                {tk}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
