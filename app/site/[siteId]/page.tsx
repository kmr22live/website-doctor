"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Background } from "@/components/wd/Background";
import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_MONO, FONT_SANS, healthMeta } from "@/lib/ui/theme";
import type { SiteReport } from "@/lib/services/report";
import { OverviewSection } from "@/components/wd/dashboard/OverviewSection";
import { IssuesSection } from "@/components/wd/dashboard/IssuesSection";
import { ChecksSection } from "@/components/wd/dashboard/ChecksSection";
import { PagesSection } from "@/components/wd/dashboard/PagesSection";
import { ChatSection } from "@/components/wd/dashboard/ChatSection";
import { IssueDrawer } from "@/components/wd/dashboard/IssueDrawer";

export type SectionId = "overview" | "issues" | "checks" | "pages" | "chat";

export default function DashboardPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("overview");
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [pageFilter, setPageFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rerunBusy, setRerunBusy] = useState<string | null>(null);

  const { data: report, refetch } = useQuery({
    queryKey: ["report", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/report`);
      if (!res.ok) throw new Error("failed to load report");
      return (await res.json()) as SiteReport;
    },
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  const health = report?.scores["health"] ?? null;
  const hm = healthMeta(health ?? 0);

  const navItems: { id: SectionId; label: string; icon: string; badge?: string; badgeBg?: string; badgeColor?: string }[] = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    {
      id: "issues",
      label: "Issues",
      icon: "bug_report",
      badge: report ? String(report.issues.length) : undefined,
      badgeBg: "rgba(251,113,133,0.12)",
      badgeColor: "#FDA4AF",
    },
    {
      id: "checks",
      label: "Check registry",
      icon: "checklist",
      badge: report && report.checks.length > 0 ? String(report.checks.length) : undefined,
      badgeBg: "rgba(255,255,255,0.07)",
      badgeColor: "rgba(231,236,244,0.7)",
    },
    {
      id: "pages",
      label: "Pages",
      icon: "web",
      badge: report && report.pages.length > 0 ? String(report.pages.length) : undefined,
      badgeBg: "rgba(255,255,255,0.07)",
      badgeColor: "rgba(231,236,244,0.7)",
    },
    { id: "chat", label: "AI assistant", icon: "forum" },
  ];

  const activeIssue = report?.issues.find((i) => i.id === activeIssueId) ?? null;

  async function rescan() {
    if (!report) return;
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: report.site.url }),
    });
    const d = (await res.json()) as { jobId?: string };
    if (d.jobId) router.push(`/analyzing/${d.jobId}`);
  }

  function goSection(id: SectionId) {
    setSection(id);
    setActiveIssueId(null);
    if (id !== "issues") setPageFilter(null);
  }

  async function rerun(target: { checkId?: string; stage?: string }) {
    if (!report?.job || rerunBusy) return;
    const scope = target.checkId ?? `stage:${target.stage}`;
    setRerunBusy(scope);
    try {
      const res = await fetch(`/api/jobs/${report.job.id}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      const d = (await res.json()) as { ok?: boolean; checksRun?: number; failed?: number; health?: number; error?: string };
      if (d.ok) {
        await refetch();
        showToast(`Re-ran ${target.checkId ?? target.stage}: ${d.checksRun} check(s), ${d.failed} failed · health ${d.health}`);
      } else {
        showToast(`Re-run failed: ${d.error ?? "unknown error"}`);
      }
    } catch {
      showToast("Re-run failed — is the server reachable?");
    } finally {
      setRerunBusy(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", fontFamily: FONT_SANS, color: "#E7ECF4", fontSize: 14, position: "relative" }}>
      <Background />
      <div data-wd-shell="1" style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
        {/* Sidebar */}
        <div data-wd-sidebar="1" style={{ width: 248, flexShrink: 0, background: "rgba(255,255,255,0.025)", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", backdropFilter: "blur(16px)" }}>
          <div data-wd-logo="1" style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg, #2DD4BF, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(45,212,191,0.35)" }}>
              <MIcon name="medical_services" size={21} color="#04110D" outlined={false} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.3, lineHeight: 1.2 }}>Website Doctor</div>
              <div style={{ fontSize: 11, color: "rgba(231,236,244,0.45)", letterSpacing: 1.5, textTransform: "uppercase" }}>Diagnosis report</div>
            </div>
          </div>
          <div data-wd-nav="1" style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
            <div
              onClick={() => router.push("/projects")}
              style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 14px", borderRadius: 12, cursor: "pointer", border: "1px solid transparent", marginBottom: 6 }}
            >
              <MIcon name="apps" size={20} color="rgba(231,236,244,0.45)" />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "rgba(231,236,244,0.75)" }}>All projects</span>
              <MIcon name="chevron_right" size={16} color="rgba(231,236,244,0.3)" outlined={false} />
            </div>
            {navItems.map((n) => {
              const active = section === n.id;
              return (
                <div
                  key={n.id}
                  onClick={() => goSection(n.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "11px 14px",
                    borderRadius: 12,
                    cursor: "pointer",
                    background: active ? "rgba(45,212,191,0.08)" : "transparent",
                    border: `1px solid ${active ? "rgba(94,234,212,0.25)" : "transparent"}`,
                  }}
                >
                  <MIcon name={n.icon} size={20} color={active ? "#5EEAD4" : "rgba(231,236,244,0.45)"} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#5EEAD4" : "rgba(231,236,244,0.75)" }}>{n.label}</span>
                  {n.badge ? (
                    <span style={{ background: n.badgeBg, color: n.badgeColor, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 9px", fontFamily: FONT_MONO }}>{n.badge}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div data-wd-sidefoot="1" style={{ marginTop: "auto", padding: 18, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 11.5, color: "rgba(231,236,244,0.45)", lineHeight: 1.7, fontFamily: FONT_MONO }}>
              {report?.site.lastScanAt
                ? `SCAN: ${new Date(report.site.lastScanAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).toUpperCase()}`
                : "NO SCAN YET"}
              <br />
              {report ? `${report.pages.length} pages · ${report.checks.length} checks` : ""}
            </div>
            <button
              onClick={() => void rescan()}
              style={{ marginTop: 12, width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)", color: "rgba(231,236,244,0.8)", borderRadius: 999, padding: "9px 0", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <MIcon name="restart_alt" size={17} />
              Re-scan site
            </button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          <div data-wd-topbar="1" style={{ minHeight: 70, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px 16px", padding: "12px 28px", boxSizing: "border-box", background: "rgba(7,9,15,0.6)", backdropFilter: "blur(16px)" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MIcon name="language" size={21} color="rgba(231,236,244,0.6)" />
            </div>
            <div style={{ minWidth: 0, flexShrink: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15.5, fontFamily: FONT_MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{report?.site.domain ?? "…"}</div>
              <div style={{ fontSize: 12, color: "rgba(231,236,244,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {report ? `${report.site.name} · ${report.pages.length} pages crawled` : ""}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            {health != null ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: hm.bg, border: `1px solid ${hm.border}`, color: hm.text, borderRadius: 999, padding: "6px 15px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: hm.color, boxShadow: `0 0 10px ${hm.glow}` }} />
                Health {health} · {hm.label}
              </span>
            ) : null}
            <button
              onClick={() => goSection("chat")}
              style={{ border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "rgba(231,236,244,0.8)", borderRadius: 999, padding: "9px 18px", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              <MIcon name="forum" size={17} />
              Ask AI
            </button>
            <button
              onClick={() => {
                if (report?.job) {
                  window.open(`/api/report/${report.job.id}/pdf`, "_blank");
                  showToast("Report queued — PDF will be ready in a moment");
                }
              }}
              style={{ border: "none", background: "linear-gradient(120deg, #2DD4BF, #3B82F6)", color: "#04110D", borderRadius: 999, padding: "10px 20px", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", flexShrink: 0, boxShadow: "0 6px 22px rgba(45,212,191,0.28)" }}
            >
              <MIcon name="download" size={17} outlined={false} />
              Export report
            </button>
          </div>

          <div data-wd-content="1" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 28, boxSizing: "border-box" }}>
            {!report ? (
              <div style={{ padding: 60, textAlign: "center", color: "rgba(231,236,244,0.45)" }}>Loading report…</div>
            ) : section === "overview" ? (
              <OverviewSection report={report} onOpenIssue={setActiveIssueId} onGoIssues={() => goSection("issues")} onAskAi={() => goSection("chat")} onGoChecks={() => goSection("checks")} />
            ) : section === "issues" ? (
              <IssuesSection key={pageFilter ?? ""} report={report} onOpenIssue={setActiveIssueId} initialQuery={pageFilter ?? ""} />
            ) : section === "checks" ? (
              <ChecksSection report={report} onOpenIssue={setActiveIssueId} onRerun={(t) => void rerun(t)} rerunBusy={rerunBusy} />
            ) : section === "pages" ? (
              <PagesSection
                report={report}
                onPickPage={(path) => {
                  setPageFilter(path);
                  setSection("issues");
                }}
              />
            ) : (
              <ChatSection report={report} />
            )}
          </div>
        </div>
      </div>

      {activeIssue ? (
        <IssueDrawer
          issue={activeIssue}
          onClose={() => setActiveIssueId(null)}
          onToggleResolved={async () => {
            const next = activeIssue.status === "open" ? "resolved" : "open";
            await fetch(`/api/issues/${activeIssue.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: next }),
            });
            await refetch();
            showToast(next === "resolved" ? "Issue marked resolved" : "Issue reopened");
          }}
          onCopied={() => showToast("Fix copied to clipboard")}
        />
      ) : null}

      {toast ? (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "rgba(13,18,32,0.95)", border: "1px solid rgba(94,234,212,0.3)", color: "#E7ECF4", borderRadius: 999, padding: "11px 24px", fontSize: 13, fontWeight: 600, boxShadow: "0 16px 50px rgba(0,0,0,0.6)", zIndex: 60, animation: "wdfade 0.2s ease", display: "flex", alignItems: "center", gap: 9 }}>
          <MIcon name="check_circle" size={16} color="#5EEAD4" outlined={false} />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
