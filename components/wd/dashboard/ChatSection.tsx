"use client";

import { useEffect, useRef, useState } from "react";
import { MIcon } from "@/components/wd/MaterialIcon";
import { FONT_SANS } from "@/lib/ui/theme";
import type { SiteReport } from "@/lib/services/report";

type ChatMsg = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "What should I fix first?",
  "Which page has the worst issues?",
  "Summarize the security findings",
  "How is the SEO health?",
];

export function ChatSection({ report }: { report: SiteReport }) {
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, typing]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || typing) return;
    setChat((c) => [...c, { role: "user", text: t }]);
    setInput("");
    setTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: report.site.id, message: t }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      setChat((c) => [...c, { role: "ai", text: data.answer ?? data.error ?? "Something went wrong — try again." }]);
    } catch {
      setChat((c) => [...c, { role: "ai", text: "The AI assistant is unavailable right now. Check the AI provider configuration and try again." }]);
    } finally {
      setTyping(false);
    }
  }

  const greeting: ChatMsg = {
    role: "ai",
    text: `Hi — I have the full analysis of ${report.site.domain} loaded: ${report.pages.length} pages, ${report.checks.length} checks, ${report.issues.length} issues.\n\nAsk me anything about the findings, or tap a suggestion below.`,
  };
  const msgs = chat.length ? chat : [greeting];

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", height: "100%", display: "flex", flexDirection: "column", animation: "wdfade 0.35s ease" }}>
      <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, backdropFilter: "blur(12px)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, rgba(45,212,191,0.2), rgba(167,139,250,0.2))", border: "1px solid rgba(94,234,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MIcon name="auto_awesome" size={18} color="#5EEAD4" outlined={false} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>AI assistant</div>
            <div style={{ fontSize: 12, color: "rgba(231,236,244,0.5)" }}>Answers only from this site&apos;s analysis data</div>
          </div>
        </div>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "78%",
                  background: m.role === "user" ? "rgba(59,130,246,0.14)" : "rgba(255,255,255,0.04)",
                  border: m.role === "user" ? "1px solid rgba(96,165,250,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                  padding: "12px 16px",
                  fontSize: 13.5,
                  lineHeight: 1.7,
                  whiteSpace: "pre-line",
                  color: "rgba(231,236,244,0.85)",
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {typing ? (
            <div style={{ display: "flex" }}>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px 14px 14px 3px", padding: "14px 18px", display: "flex", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5EEAD4", animation: "wdblink 1s infinite" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5EEAD4", animation: "wdblink 1s infinite 0.2s" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5EEAD4", animation: "wdblink 1s infinite 0.4s" }} />
              </div>
            </div>
          ) : null}
        </div>
        <div style={{ padding: "14px 24px 18px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {SUGGESTIONS.map((sug) => (
              <button key={sug} onClick={() => void send(sug)} style={{ border: "1px solid rgba(94,234,212,0.25)", background: "rgba(45,212,191,0.06)", borderRadius: 999, padding: "6px 14px", fontFamily: FONT_SANS, fontSize: 12.5, color: "#5EEAD4", cursor: "pointer" }}>
                {sug}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "0 18px" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send(input);
                }}
                placeholder="Ask about this website…"
                style={{ flex: 1, border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 14, padding: "12px 0", background: "transparent", color: "#E7ECF4", minWidth: 0 }}
              />
            </div>
            <button onClick={() => void send(input)} style={{ border: "none", background: "linear-gradient(120deg, #2DD4BF, #3B82F6)", color: "#04110D", borderRadius: 999, padding: "0 24px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 6px 20px rgba(45,212,191,0.25)" }}>
              <MIcon name="send" size={17} outlined={false} />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
