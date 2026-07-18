"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Background } from "@/components/wd/Background";
import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_MONO, FONT_SANS } from "@/lib/ui/theme";
import { STAGES } from "@/lib/services/stages";
import type { JobView } from "@/lib/services/jobs";

export default function AnalyzingPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const logRef = useRef<HTMLDivElement>(null);

  // Primary: Server-Sent Events. Fallback: React Query polling if SSE errors.
  const [sseJob, setSseJob] = useState<JobView | null>(null);
  const [sseFailed, setSseFailed] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/jobs/${jobId}/stream`);
    es.onmessage = (ev) => {
      try {
        setSseJob(JSON.parse(ev.data) as JobView);
      } catch {
        // malformed frame — ignore
      }
    };
    es.onerror = () => {
      // If we already have a terminal state the server closed normally.
      setSseJob((cur) => {
        if (!cur || (cur.status !== "completed" && cur.status !== "failed" && cur.status !== "partial")) {
          setSseFailed(true);
        }
        return cur;
      });
      es.close();
    };
    return () => es.close();
  }, [jobId]);

  const { data: polledJob } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) throw new Error("job not found");
      return (await res.json()) as JobView;
    },
    enabled: sseFailed,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "completed" || s === "failed" || s === "partial" ? false : 900;
    },
  });

  const job = sseJob ?? polledJob;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [job?.logs.length]);

  useEffect(() => {
    if (job && (job.status === "completed" || job.status === "partial")) {
      const t = setTimeout(() => router.push(`/site/${job.websiteId}`), 1100);
      return () => clearTimeout(t);
    }
  }, [job, router]);

  const idx = job ? (job.status === "completed" || job.status === "partial" ? STAGES.length : job.stageIndex) : -1;
  const progress = job ? (job.status === "completed" || job.status === "partial" ? 100 : job.progress) : 0;
  const domain = job ? job.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
  const failed = job?.status === "failed";

  const stageLabel = failed
    ? "Analysis failed"
    : idx >= STAGES.length
      ? "Analysis complete — building your report"
      : idx >= 0 && STAGES[idx]
        ? `Stage ${idx + 1} of ${STAGES.length} · ${STAGES[idx].name}`
        : "Queued…";

  const liveStats = [
    { label: "Pages found", value: String(job?.stats.pagesFound ?? 0) },
    { label: "Screenshots", value: String(job?.stats.screenshots ?? 0) },
    { label: "Checks run", value: String(job?.stats.checksRun ?? 0) },
    { label: "AI reviews", value: String(job?.stats.aiReviews ?? 0) },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", fontFamily: FONT_SANS, color: "#E7ECF4", fontSize: 14, position: "relative" }}>
      <Background />
      <div style={{ minHeight: "100vh", padding: "44px 24px", boxSizing: "border-box", display: "flex", justifyContent: "center", position: "relative" }}>
        <div style={{ width: "100%", maxWidth: 1080, display: "flex", flexDirection: "column", gap: 20, animation: "wdfade 0.4s ease" }}>
          <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "24px 28px", backdropFilter: "blur(12px)" }}>
            <div data-wd-scanhead="1" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: failed ? "rgba(251,113,133,0.1)" : "rgba(45,212,191,0.1)", border: failed ? "1px solid rgba(251,113,133,0.3)" : "1px solid rgba(94,234,212,0.25)", display: "flex", alignItems: "center", justifyContent: "center", animation: failed ? undefined : "wdpulse 2s infinite" }}>
                  {failed ? (
                    <MIcon name="error" size={26} color="#FB7185" outlined={false} />
                  ) : (
                    <MIcon name="autorenew" size={26} color="#5EEAD4" outlined={false} style={{ animation: "wdspin 1.2s linear infinite", display: "inline-block" }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
                    {failed ? "Diagnosis failed for " : "Diagnosing "}
                    <span style={{ color: "#5EEAD4", fontFamily: FONT_MONO, fontSize: 17 }}>{domain}</span>
                  </div>
                  <div style={{ fontSize: 13, color: failed ? "#FDA4AF" : "rgba(231,236,244,0.55)", marginTop: 3 }}>
                    {failed ? (job?.error ?? "Unknown error") : stageLabel}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 28, fontWeight: 700, background: "linear-gradient(100deg, #2DD4BF, #60A5FA)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{progress}%</span>
                <button onClick={() => router.push("/projects")} style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(231,236,244,0.7)", borderRadius: 999, padding: "8px 18px", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {failed ? "Back to projects" : "Cancel"}
                </button>
              </div>
            </div>
            <div style={{ marginTop: 20, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #2DD4BF, #3B82F6, #A78BFA)", borderRadius: 3, boxShadow: "0 0 16px rgba(45,212,191,0.5)", transition: "width 0.5s ease" }} />
            </div>
          </div>

          <div data-wd-analyze="1" style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 20, alignItems: "start" }}>
            {/* Pipeline timeline */}
            <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "12px 0", backdropFilter: "blur(12px)" }}>
              <div style={{ padding: "12px 24px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(231,236,244,0.4)" }}>Pipeline</div>
              {STAGES.map((st, i) => {
                const done = i < idx;
                const active = i === idx && !failed;
                return (
                  <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 24px", background: active ? "rgba(45,212,191,0.07)" : "transparent", position: "relative" }}>
                    {done ? (
                      <MIcon name="check_circle" size={20} color="#34D399" outlined={false} />
                    ) : active ? (
                      <MIcon name="autorenew" size={20} color="#5EEAD4" outlined={false} style={{ animation: "wdspin 1.2s linear infinite", display: "inline-block" }} />
                    ) : (
                      <MIcon name="circle" size={20} color="rgba(231,236,244,0.18)" />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: active || done ? 600 : 400, color: done ? "rgba(231,236,244,0.55)" : active ? "#5EEAD4" : "rgba(231,236,244,0.3)" }}>{st.name}</div>
                      {active ? <div style={{ fontSize: 12, color: "rgba(231,236,244,0.5)", marginTop: 1 }}>{st.detail}</div> : null}
                    </div>
                    <MIcon name={st.icon} size={17} color="rgba(231,236,244,0.2)" />
                  </div>
                );
              })}
            </div>

            {/* Live stats + telemetry log — minWidth 0 stops long URLs blowing the grid out */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
              <div data-wd-stats="1" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {liveStats.map((ls) => (
                  <div key={ls.label} style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "16px 18px", backdropFilter: "blur(8px)" }}>
                    <div style={{ fontSize: 12, color: "rgba(231,236,244,0.5)" }}>{ls.label}</div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 28, fontWeight: 700, marginTop: 6, color: "#E7ECF4" }}>{ls.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(3,6,12,0.75)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "18px 0", display: "flex", flexDirection: "column", minHeight: 330, minWidth: 0, backdropFilter: "blur(12px)" }}>
                <div style={{ padding: "0 24px 12px", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(231,236,244,0.35)", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: failed ? "#FB7185" : "#34D399", boxShadow: failed ? "0 0 10px rgba(251,113,133,0.8)" : "0 0 10px rgba(52,211,153,0.8)", animation: "wdblink 1.2s infinite" }} />
                  Live telemetry
                </div>
                <div ref={logRef} style={{ flex: 1, overflowY: "auto", maxHeight: 310, padding: "0 24px", fontFamily: FONT_MONO, fontSize: 12, lineHeight: 2 }}>
                  {(job?.logs ?? []).map((lg, i) => (
                    <div key={i} style={{ color: lg.level === "error" ? "#FDA4AF" : lg.level === "warn" ? "#FCD34D" : lg.message.startsWith("✓") ? "#6EE7B7" : "rgba(231,236,244,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ color: "rgba(231,236,244,0.25)" }}>
                        {new Date(lg.ts).toLocaleTimeString("en-GB", { hour12: false })}
                      </span>
                      {"  "}
                      {lg.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
