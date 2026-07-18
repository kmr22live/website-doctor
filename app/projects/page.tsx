"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Background } from "@/components/wd/Background";
import { MIcon } from "@/components/wd/MaterialIcon";
import { ProjectsSidebar } from "@/components/wd/ProjectsSidebar";
import { FONT_MONO, FONT_SANS, healthMeta } from "@/lib/ui/theme";
import type { SiteSummary } from "@/lib/services/sites";

function formatScan(ts: number | null): string {
  if (!ts) return "never scanned";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProjectsPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const res = await fetch("/api/sites");
      if (!res.ok) throw new Error("failed to load sites");
      return (await res.json()) as { sites: SiteSummary[] };
    },
  });

  const sites = data?.sites ?? [];

  async function rescan(url: string) {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const d = (await res.json()) as { jobId?: string };
    if (d.jobId) router.push(`/analyzing/${d.jobId}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", fontFamily: FONT_SANS, color: "#E7ECF4", fontSize: 14, position: "relative" }}>
      <Background />
      <div data-wd-shell="1" style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
        <ProjectsSidebar sites={sites} />
        <div data-wd-content="1" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", padding: "34px 28px", boxSizing: "border-box" }}>
          <div style={{ width: "100%", maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22, animation: "wdfade 0.4s ease" }}>
          <div data-wd-scanhead="1" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #2DD4BF, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(45,212,191,0.35)" }}>
              <MIcon name="medical_services" size={24} color="#04110D" outlined={false} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Projects</h2>
              <div style={{ fontSize: 13, color: "rgba(231,236,244,0.5)", marginTop: 2 }}>
                {sites.length} {sites.length === 1 ? "website monitored" : "websites monitored"} · open any report or run a new diagnosis
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              style={{ border: "none", background: "linear-gradient(120deg, #2DD4BF, #3B82F6)", color: "#04110D", borderRadius: 999, padding: "12px 24px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 28px rgba(45,212,191,0.3)", whiteSpace: "nowrap" }}
            >
              <MIcon name="add" size={18} outlined={false} />
              New scan
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: 60, textAlign: "center", color: "rgba(231,236,244,0.45)" }}>Loading projects…</div>
          ) : sites.length === 0 ? (
            <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, padding: "64px 32px", textAlign: "center", backdropFilter: "blur(8px)" }}>
              <MIcon name="travel_explore" size={44} color="rgba(231,236,244,0.25)" />
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>No websites scanned yet</div>
              <div style={{ fontSize: 13.5, color: "rgba(231,236,244,0.5)", marginTop: 8, lineHeight: 1.6 }}>
                Run your first diagnosis to see health scores, issues and AI-drafted fixes here.
              </div>
              <button
                onClick={() => router.push("/")}
                style={{ marginTop: 22, border: "none", background: "linear-gradient(120deg, #2DD4BF, #3B82F6)", color: "#04110D", borderRadius: 999, padding: "12px 26px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 8px 28px rgba(45,212,191,0.3)" }}
              >
                <MIcon name="troubleshoot" size={18} outlined={false} />
                Run first scan
              </button>
            </div>
          ) : (
            <div data-wd-pages="1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
              {sites.map((site) => {
                const hm = healthMeta(site.health ?? 0);
                return (
                  <div
                    key={site.id}
                    onClick={() => router.push(`/site/${site.id}`)}
                    style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, padding: 20, cursor: "pointer", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", gap: 14 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <MIcon name="language" size={20} color="rgba(231,236,244,0.6)" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, fontFamily: FONT_MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{site.domain}</div>
                        <div style={{ fontSize: 12, color: "rgba(231,236,244,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{site.name}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void rescan(site.url);
                        }}
                        title="Re-scan"
                        style={{ border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(231,236,244,0.6)", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      >
                        <MIcon name="restart_alt" size={16} />
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 40, fontWeight: 700, color: hm.color, textShadow: `0 0 22px ${hm.glow}`, lineHeight: 1 }}>
                        {site.health ?? "—"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: hm.color }}>{site.health != null ? hm.label : "No report yet"}</div>
                        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginTop: 6 }}>
                          <div style={{ height: "100%", width: `${site.health ?? 0}%`, background: hm.color, borderRadius: 3, boxShadow: `0 0 8px ${hm.glow}` }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(231,236,244,0.7)", borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}>{site.pages} pages</span>
                      <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(231,236,244,0.7)", borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}>{site.issues} issues</span>
                      <span style={{ background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.35)", color: "#FDA4AF", borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{site.critical} critical</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
                      <span style={{ fontSize: 11.5, color: "rgba(231,236,244,0.4)", fontFamily: FONT_MONO }}>{formatScan(site.lastScanAt)}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#5EEAD4", fontSize: 12.5, fontWeight: 600 }}>
                        Open report
                        <MIcon name="arrow_forward" size={15} outlined={false} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
