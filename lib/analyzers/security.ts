import tls from "node:tls";
import { analyzerCheck } from "@/lib/analyzers/helpers";
import type { AnalyzerContext } from "@/lib/analyzers/types";
import type { EvaluatedCheck } from "@/lib/rules/engine";
import type { IssueSeverity, CheckClass, ScoreCategory } from "@/lib/types";

type TlsInfo = { protocol: string | null; validTo: string | null; daysLeft: number | null; issuer: string | null };

function probeTls(host: string, timeoutMs = 8000): Promise<TlsInfo | null> {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: timeoutMs, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      const protocol = socket.getProtocol();
      let daysLeft: number | null = null;
      let validTo: string | null = null;
      if (cert && cert.valid_to) {
        validTo = cert.valid_to;
        daysLeft = Math.round((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000);
      }
      const issuerObj = cert?.issuer as Record<string, string> | undefined;
      socket.end();
      resolve({ protocol, validTo, daysLeft, issuer: issuerObj?.O ?? issuerObj?.CN ?? null });
    });
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

type HeaderCheckDef = {
  id: string;
  name: string;
  header: string;
  failSeverity: IssueSeverity;
  checkClass: CheckClass;
  title: string;
  impact: string;
  fix: string;
  code: string;
};

const HEADER_CHECKS: HeaderCheckDef[] = [
  {
    id: "sec-csp",
    name: "Content-Security-Policy header set",
    header: "content-security-policy",
    failSeverity: "high",
    checkClass: "critical",
    title: "Content-Security-Policy header missing",
    impact: "Without CSP, any injected script runs unrestricted — the main defense-in-depth against XSS is absent.",
    fix: "Add a CSP at the web-server level; roll out in report-only mode first.",
    code: 'add_header Content-Security-Policy "default-src \'self\'" always;',
  },
  {
    id: "sec-hsts",
    name: "Strict-Transport-Security (HSTS) set",
    header: "strict-transport-security",
    failSeverity: "high",
    checkClass: "critical",
    title: "Strict-Transport-Security (HSTS) header missing",
    impact: "First visits can be silently downgraded to HTTP by an on-path attacker (SSL-stripping).",
    fix: "Add the HSTS header with a long max-age once HTTPS is stable.",
    code: 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
  },
  {
    id: "sec-xcto",
    name: "X-Content-Type-Options: nosniff set",
    header: "x-content-type-options",
    failSeverity: "medium",
    checkClass: "warning",
    title: "X-Content-Type-Options header missing",
    impact: "Browsers may MIME-sniff responses into executable types, enabling drive-by content attacks.",
    fix: "Add the nosniff header on every response.",
    code: "add_header X-Content-Type-Options nosniff always;",
  },
  {
    id: "sec-xfo",
    name: "X-Frame-Options / frame-ancestors set",
    header: "x-frame-options",
    failSeverity: "medium",
    checkClass: "warning",
    title: "Clickjacking protection missing (X-Frame-Options)",
    impact: "The site can be framed by hostile pages and used in clickjacking overlays against your users.",
    fix: "Add X-Frame-Options (or CSP frame-ancestors).",
    code: "add_header X-Frame-Options SAMEORIGIN always;",
  },
  {
    id: "sec-referrer-policy",
    name: "Referrer-Policy header set",
    header: "referrer-policy",
    failSeverity: "low",
    checkClass: "warning",
    title: "Referrer-Policy header missing",
    impact: "Full URLs (including query params) leak to every third-party site you link to.",
    fix: "Add a restrictive referrer policy.",
    code: "add_header Referrer-Policy strict-origin-when-cross-origin always;",
  },
  {
    id: "sec-permissions-policy",
    name: "Permissions-Policy header set",
    header: "permissions-policy",
    failSeverity: "low",
    checkClass: "notice",
    title: "Permissions-Policy header missing",
    impact: "Embedded third-party content can request powerful browser features (camera, geolocation) unhindered.",
    fix: "Declare which features the site actually needs; deny the rest.",
    code: 'add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;',
  },
];

/** REAL security posture probe: response headers, cookie flags, TLS cert + version. */
export async function runSecurity(ctx: AnalyzerContext): Promise<EvaluatedCheck[]> {
  const { jobId, hooks } = ctx;
  const checks: EvaluatedCheck[] = [];
  const first = ctx.pages[0];
  if (!first) return checks;

  const headers = first.crawled.fetched.headers;
  const url = first.crawled.fetched.finalUrl;
  const scoreCategory: ScoreCategory = "best-practices";

  for (const def of HEADER_CHECKS) {
    const present = headers[def.header] !== undefined;
    checks.push(
      analyzerCheck({
        id: def.id,
        name: def.name,
        category: "Security",
        checkClass: def.checkClass,
        failSeverity: def.failSeverity,
        scoreCategory,
        dataSource: "tls",
        pageId: null,
        result: present
          ? { status: "pass", evidence: `${def.header}: ${String(headers[def.header]).slice(0, 120)}` }
          : { status: "fail", evidence: `${def.header} header absent on ${url}` },
        issue: {
          title: def.title,
          description: `No ${def.header} header on responses from ${url}.`,
          businessImpact: def.impact,
          fix: def.fix,
          code: def.code,
          effort: "low",
        },
      }),
    );
  }

  // Cookie flags
  const setCookie = headers["set-cookie"];
  if (setCookie) {
    const lc = setCookie.toLowerCase();
    const missing: string[] = [];
    if (!lc.includes("secure")) missing.push("Secure");
    if (!lc.includes("httponly")) missing.push("HttpOnly");
    if (!lc.includes("samesite")) missing.push("SameSite");
    checks.push(
      analyzerCheck({
        id: "sec-cookie-flags",
        name: "Cookies set with Secure/HttpOnly/SameSite",
        category: "Security",
        checkClass: "warning",
        failSeverity: "medium",
        scoreCategory,
        dataSource: "tls",
        pageId: null,
        result:
          missing.length > 0
            ? { status: "fail", evidence: `cookie flags missing: ${missing.join(", ")}`, details: missing.join(", ") }
            : { status: "pass", evidence: "cookies carry Secure/HttpOnly/SameSite" },
        issue: {
          title: `Cookies missing ${missing.join(" + ")} flag(s)`,
          description: `Set-Cookie on ${url} omits: ${missing.join(", ")}.`,
          businessImpact: "Cookies without protective flags can be exfiltrated over HTTP or read by injected scripts — session-hijacking exposure.",
          fix: "Set Secure, HttpOnly, and SameSite on every cookie.",
          code: "Set-Cookie: session=…; Secure; HttpOnly; SameSite=Lax",
          effort: "low",
        },
      }),
    );
  }

  // Server header leak
  const server = headers["server"] ?? headers["x-powered-by"];
  const leaksVersion = server !== undefined && /\d/.test(server);
  checks.push(
    analyzerCheck({
      id: "sec-server-leak",
      name: "Server version not leaked in headers",
      category: "Security",
      checkClass: "notice",
      failSeverity: "low",
      scoreCategory,
      dataSource: "tls",
      pageId: null,
      result: leaksVersion
        ? { status: "fail", evidence: `server header leaks version: "${server}"`, details: server }
        : { status: "pass", evidence: server ? `server header present without version: "${server}"` : "no server identification header" },
      issue: {
        title: `Server version leaked in headers ("${server ?? ""}")`,
        description: `Responses from ${url} advertise the exact server software/version, which maps directly to known CVE lists.`,
        businessImpact: "Version disclosure hands attackers a shortcut to matching exploits.",
        fix: "Strip or genericize the Server / X-Powered-By headers at the proxy.",
        code: "server_tokens off;",
        effort: "low",
      },
    }),
  );

  // TLS probe
  try {
    const host = new URL(url).hostname;
    if (url.startsWith("https://")) {
      const info = await probeTls(host);
      if (info) {
        hooks.appendLog(jobId, `TLS ${info.protocol ?? "?"} · cert valid for ${info.daysLeft ?? "?"} days (${info.issuer ?? "unknown issuer"})`);
        checks.push(
          analyzerCheck({
            id: "sec-cert-expiry",
            name: "TLS certificate not near expiry",
            category: "Security",
            checkClass: "critical",
            failSeverity: "critical",
            scoreCategory,
            dataSource: "tls",
            pageId: null,
            result:
              info.daysLeft !== null && info.daysLeft < 14
                ? { status: "fail", evidence: `certificate expires in ${info.daysLeft} days (${info.validTo})`, details: info.daysLeft }
                : info.daysLeft !== null
                  ? { status: "pass", evidence: `certificate valid for ${info.daysLeft} days` }
                  : { status: "not-evaluated", evidence: "certificate dates unavailable" },
            issue: {
              title: `TLS certificate expires in ${info.daysLeft ?? "?"} days`,
              description: `The certificate for ${host} expires ${info.validTo ?? "soon"}. After expiry every browser shows a full-page security warning.`,
              businessImpact: "An expired certificate takes the site fully offline for practical purposes — browsers block access.",
              fix: "Renew the certificate now and enable auto-renewal (e.g. certbot / managed TLS).",
              effort: "low",
            },
          }),
          analyzerCheck({
            id: "sec-tls-version",
            name: "TLS 1.2+ negotiated",
            category: "Security",
            checkClass: "critical",
            failSeverity: "high",
            scoreCategory,
            dataSource: "tls",
            pageId: null,
            result:
              info.protocol && /TLSv1\.[01]|SSL/.test(info.protocol)
                ? { status: "fail", evidence: `negotiated ${info.protocol}`, details: info.protocol }
                : info.protocol
                  ? { status: "pass", evidence: `negotiated ${info.protocol}` }
                  : { status: "not-evaluated", evidence: "protocol unavailable" },
            issue: {
              title: `Legacy TLS version in use (${info.protocol ?? "?"})`,
              description: `${host} negotiated ${info.protocol ?? "an outdated protocol"} — TLS below 1.2 has known cryptographic weaknesses.`,
              businessImpact: "Legacy TLS fails PCI-DSS compliance and modern browsers increasingly refuse it.",
              fix: "Disable TLS 1.0/1.1 at the server; allow only TLS 1.2+.",
              effort: "low",
            },
          }),
        );
      } else {
        hooks.appendLog(jobId, `TLS probe to ${host}:443 failed`, "warn");
      }
    }
  } catch {
    // TLS probing is best-effort
  }

  return checks;
}
