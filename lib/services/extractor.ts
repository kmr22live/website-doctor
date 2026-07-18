import * as cheerio from "cheerio";
import type { ExtractedPage, ElementSample } from "@/lib/types/extracted";

const SAMPLE_CAP = 5;
const SAMPLE_HTML_MAX = 300;

const DEPRECATED_TAGS = ["center", "font", "marquee", "blink", "big", "strike", "tt", "acronym", "applet", "frame", "frameset"];

const EVENT_ATTRS = ["onclick", "onload", "onmouseover", "onmouseout", "onchange", "onsubmit", "onkeydown", "onkeyup", "onfocus", "onblur", "onerror"];

function absolutize(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/** Best-effort selector for a cheerio element: tag#id.class1.class2 */
function selectorFor($: cheerio.CheerioAPI, el: Parameters<cheerio.CheerioAPI>[0]): string | null {
  const e = $(el);
  const tag = (e.prop("tagName") as string | undefined)?.toLowerCase();
  if (!tag) return null;
  const id = e.attr("id");
  const classes = (e.attr("class") ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 3);
  return `${tag}${id ? `#${id}` : ""}${classes.map((c) => `.${c}`).join("")}`;
}

/** Captures the element's real HTML (truncated) + a locating selector. */
function sampleOf($: cheerio.CheerioAPI, el: Parameters<cheerio.CheerioAPI>[0]): ElementSample {
  const html = ($.html(el) ?? "").replace(/\s+/g, " ").trim().slice(0, SAMPLE_HTML_MAX);
  return { selector: selectorFor($, el), html };
}

function isInternalLink(href: string, base: string): boolean {
  try {
    const u = new URL(href, base);
    return u.hostname === new URL(base).hostname;
  } catch {
    return false;
  }
}

/** REAL extraction with Cheerio over the fetched DOM HTML. */
export function extractPage(
  html: string,
  url: string,
  finalUrl: string,
  statusCode: number | null,
): ExtractedPage {
  const $ = cheerio.load(html);
  const base = finalUrl || url;

  const samples: ExtractedPage["samples"] = {
    missingAlt: [],
    badLinks: [],
    inlineHandlers: [],
    inlineStyles: [],
    deprecatedTags: [],
    unlabeledInputs: [],
    blockingScripts: [],
  };
  const take = (bucket: ElementSample[], el: Parameters<cheerio.CheerioAPI>[0]) => {
    if (bucket.length < SAMPLE_CAP) bucket.push(sampleOf($, el));
  };

  const titleEls = $("head title");
  const title = titleEls.first().text().trim() || null;

  const descEls = $('head meta[name="description" i]');
  const metaDescription = descEls.first().attr("content")?.trim() ?? null;

  const canonicalEls = $('head link[rel="canonical" i]');
  const canonical = canonicalEls.first().attr("href")?.trim() ?? null;

  const robotsMeta = $('head meta[name="robots" i]').first().attr("content")?.trim() ?? null;

  const viewportEls = $('head meta[name="viewport" i]');
  const viewport = viewportEls.first().attr("content")?.trim() ?? null;

  const charset =
    $("meta[charset]").first().attr("charset") ??
    /charset=([\w-]+)/i.exec($('meta[http-equiv="Content-Type" i]').first().attr("content") ?? "")?.[1] ??
    null;

  const htmlLang = $("html").attr("lang")?.trim() ?? null;

  const favicon =
    $('link[rel="icon" i], link[rel="shortcut icon" i]').first().attr("href")?.trim() ?? null;
  const appleTouchIcon = $('link[rel="apple-touch-icon" i]').first().attr("href")?.trim() ?? null;

  const headings: ExtractedPage["headings"] = [];
  for (let level = 1; level <= 6; level++) {
    $(`h${level}`).each((_, el) => {
      headings.push({ level, text: $(el).text().trim().slice(0, 300) });
    });
  }

  const images: ExtractedPage["images"] = [];
  $("img").each((_, el) => {
    const e = $(el);
    const src = e.attr("src") ?? e.attr("data-src") ?? "";
    const alt = e.attr("alt") ?? null;
    if (alt === null) take(samples.missingAlt, el);
    images.push({
      src: src ? absolutize(src, base) : "",
      alt,
      width: e.attr("width") ?? null,
      height: e.attr("height") ?? null,
      loading: e.attr("loading") ?? null,
    });
  });

  const links: ExtractedPage["links"] = [];
  $("a").each((_, el) => {
    const e = $(el);
    const href = e.attr("href");
    if (href === undefined) return;
    const h = href.trim().toLowerCase();
    if (h === "" || h === "#" || h.startsWith("javascript:")) take(samples.badLinks, el);
    links.push({
      href,
      text: e.text().trim().slice(0, 200),
      rel: e.attr("rel") ?? null,
      target: e.attr("target") ?? null,
      isInternal: isInternalLink(href, base),
    });
  });

  const forms: ExtractedPage["forms"] = [];
  $("form").each((_, el) => {
    const f = $(el);
    const inputs = f.find("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea");
    let withoutLabel = 0;
    let withoutRequired = 0;
    inputs.each((_i, inp) => {
      const ie = $(inp);
      const id = ie.attr("id");
      const hasLabelFor = id ? $(`label[for="${id}"]`).length > 0 : false;
      const hasAriaLabel = !!ie.attr("aria-label") || !!ie.attr("aria-labelledby");
      const wrappedInLabel = ie.parents("label").length > 0;
      if (!hasLabelFor && !hasAriaLabel && !wrappedInLabel) {
        withoutLabel++;
        take(samples.unlabeledInputs, inp);
      }
      if (ie.attr("required") === undefined && ie.attr("aria-required") === undefined) withoutRequired++;
    });
    forms.push({
      action: f.attr("action") ?? null,
      method: f.attr("method")?.toUpperCase() ?? null,
      inputCount: inputs.length,
      inputsWithoutLabel: withoutLabel,
      inputsWithoutRequired: withoutRequired,
      hasSubmit: f.find('button[type=submit], input[type=submit], button:not([type])').length > 0,
    });
  });

  const buttons: string[] = [];
  $("button, input[type=submit], input[type=button], [role=button]").each((_, el) => {
    const e = $(el);
    buttons.push((e.text().trim() || e.attr("value") || e.attr("aria-label") || "").slice(0, 100));
  });

  const scripts: ExtractedPage["scripts"] = [];
  $("script").each((_, el) => {
    const e = $(el);
    const src = e.attr("src") ? absolutize(e.attr("src") as string, base) : null;
    const isAsync = e.attr("async") !== undefined;
    const isDefer = e.attr("defer") !== undefined;
    const type = e.attr("type") ?? null;
    if (src && !isAsync && !isDefer && type !== "module" && (type === null || type === "text/javascript")) {
      take(samples.blockingScripts, el);
    }
    scripts.push({ src, async: isAsync, defer: isDefer, type });
  });

  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed: unknown = JSON.parse($(el).text());
      const collect = (node: unknown) => {
        if (Array.isArray(node)) node.forEach(collect);
        else if (node && typeof node === "object") {
          const t = (node as Record<string, unknown>)["@type"];
          if (typeof t === "string") schemaTypes.push(t);
          else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && schemaTypes.push(x));
          const g = (node as Record<string, unknown>)["@graph"];
          if (Array.isArray(g)) g.forEach(collect);
        }
      };
      collect(parsed);
    } catch {
      // invalid JSON-LD — ignored here; a rule can flag it separately
    }
  });

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:" i]').each((_, el) => {
    const p = $(el).attr("property");
    const c = $(el).attr("content");
    if (p && c) ogTags[p.toLowerCase()] = c;
  });

  const twitterTags: Record<string, string> = {};
  $('meta[name^="twitter:" i]').each((_, el) => {
    const n = $(el).attr("name");
    const c = $(el).attr("content");
    if (n && c) twitterTags[n.toLowerCase()] = c;
  });

  let inlineEventHandlerCount = 0;
  for (const attr of EVENT_ATTRS) {
    $(`[${attr}]`).each((_, el) => {
      inlineEventHandlerCount++;
      take(samples.inlineHandlers, el);
    });
  }

  const inlineStyleCount = $("[style]").length;
  $("[style]").each((_, el) => take(samples.inlineStyles, el));

  const deprecatedTags = DEPRECATED_TAGS.filter((t) => {
    const found = $(t);
    const first = found.get(0);
    if (first) take(samples.deprecatedTags, first);
    return found.length > 0;
  });

  const htmlLower = html.toLowerCase();
  const hasGtm = htmlLower.includes("googletagmanager.com/gtm.js") || /gtm-[a-z0-9]+/i.test(html);
  const hasGa4 =
    htmlLower.includes("googletagmanager.com/gtag/js") ||
    /gtag\s*\(\s*['"]config['"]\s*,\s*['"]g-/i.test(html);
  const hasFbPixel = htmlLower.includes("connect.facebook.net") || htmlLower.includes("fbq(");

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  const mixedContentUrls: string[] = [];
  if (base.startsWith("https://")) {
    $("img[src^='http://'], script[src^='http://'], link[href^='http://'][rel='stylesheet'], iframe[src^='http://'], video[src^='http://'], audio[src^='http://']").each(
      (_, el) => {
        const src = $(el).attr("src") ?? $(el).attr("href");
        if (src) mixedContentUrls.push(src.slice(0, 300));
      },
    );
  }

  return {
    url,
    finalUrl,
    statusCode,
    title,
    titleCount: titleEls.length,
    metaDescription,
    metaDescriptionCount: descEls.length,
    canonical,
    canonicalCount: canonicalEls.length,
    robotsMeta,
    viewport,
    viewportCount: viewportEls.length,
    charset,
    htmlLang,
    favicon,
    appleTouchIcon,
    headings,
    images,
    links,
    forms,
    buttons,
    scripts,
    schemaTypes,
    ogTags,
    twitterTags,
    inlineEventHandlerCount,
    inlineStyleCount,
    deprecatedTags,
    hasGa4,
    hasGtm,
    hasFbPixel,
    wordCount,
    htmlBytes: Buffer.byteLength(html, "utf8"),
    hasDoctype: /^\s*<!doctype html/i.test(html),
    mixedContentUrls,
    textSample: bodyText.slice(0, 2000),
    samples,
  };
}
