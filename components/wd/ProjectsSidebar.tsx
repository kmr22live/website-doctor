"use client";

import { useRouter } from "next/navigation";
import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_MONO, FONT_SANS, healthMeta } from "@/lib/ui/theme";
import type { SiteSummary } from "@/lib/services/sites";

/** Sidebar for the Projects view: logo, nav, quick list of scanned sites. */
export function ProjectsSidebar({ sites }: { sites: SiteSummary[] }) {
  const router = useRouter();

  return (
    <div data-wd-sidebar="1" style={{ width: 248, flexShrink: 0, background: "rgba(255,255,255,0.025)", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", backdropFilter: "blur(16px)" }}>
      <div data-wd-logo="1" style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg, #2DD4BF, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(45,212,191,0.35)" }}>
          <MIcon name="medical_services" size={21} color="#04110D" outlined={false} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.3, lineHeight: 1.2 }}>Website Doctor</div>
          <div style={{ fontSize: 11, color: "rgba(231,236,244,0.45)", letterSpacing: 1.5, textTransform: "uppercase" }}>Projects</div>
        </div>
      </div>

      <div data-wd-nav="1" style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3, minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 14px", borderRadius: 12, cursor: "default", background: "rgba(45,212,191,0.08)", border: "1px solid rgba(94,234,212,0.25)" }}>
          <MIcon name="apps" size={20} color="#5EEAD4" />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#5EEAD4" }}>All projects</span>
          <span style={{ background: "rgba(255,255,255,0.07)", color: "rgba(231,236,244,0.7)", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 9px", fontFamily: FONT_MONO }}>{sites.length}</span>
        </div>
        <div
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 14px", borderRadius: 12, cursor: "pointer", border: "1px solid transparent" }}
        >
          <MIcon name="troubleshoot" size={20} color="rgba(231,236,244,0.45)" outlined={false} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "rgba(231,236,244,0.75)" }}>New scan</span>
          <MIcon name="chevron_right" size={16} color="rgba(231,236,244,0.3)" outlined={false} />
        </div>

        {sites.length > 0 ? (
          <>
            <div style={{ padding: "14px 14px 6px", fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(231,236,244,0.35)" }}>
              Scanned sites
            </div>
            {sites.map((s) => {
              const hm = healthMeta(s.health ?? 0);
              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/site/${s.id}`)}
                  title={s.domain}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 12, cursor: "pointer", border: "1px solid transparent" }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.health != null ? hm.color : "rgba(231,236,244,0.25)", boxShadow: s.health != null ? `0 0 8px ${hm.glow}` : "none", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontFamily: FONT_MONO, color: "rgba(231,236,244,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.domain}</span>
                  <span style={{ fontSize: 11.5, fontFamily: FONT_MONO, fontWeight: 700, color: s.health != null ? hm.color : "rgba(231,236,244,0.3)", flexShrink: 0 }}>{s.health ?? "—"}</span>
                </div>
              );
            })}
          </>
        ) : null}
      </div>

      <div data-wd-sidefoot="1" style={{ marginTop: "auto", padding: 18, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 11.5, color: "rgba(231,236,244,0.45)", lineHeight: 1.7, fontFamily: FONT_MONO }}>
          {sites.length} {sites.length === 1 ? "SITE" : "SITES"} MONITORED
          <br />
          {sites.reduce((a, s) => a + s.issues, 0)} open issues total
        </div>
        <button
          onClick={() => router.push("/")}
          style={{ marginTop: 12, width: "100%", border: "none", background: "linear-gradient(120deg, #2DD4BF, #3B82F6)", color: "#04110D", borderRadius: 999, padding: "9px 0", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 22px rgba(45,212,191,0.28)" }}
        >
          <MIcon name="add" size={17} outlined={false} />
          New scan
        </button>
      </div>
    </div>
  );
}
